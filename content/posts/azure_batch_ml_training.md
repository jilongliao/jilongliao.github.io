---
date: '2018-05-28'
draft: false
title: 'Azure Batch, Containers and Machine Learning'
tags: ["ml"]
toc: true
---

I often encounter into a situation that I need a big virtual machine to run some Python script to train a machine learning model because the training dataset is bigger than my machine's memory. Most of time, I would go to Azure portal, create a big VM, run it and tear it down because it is too expensive to leave the big VM running always. It is just too much overhead for the whole process and it become very costly if I want to run multiple experiment. 

Certainly, I could use a managed services like [Azure Databricks][1] to help me. However, not every algorithms are able to run on Azure Databricks with PySpark or Scala. In my scenario, I need to train the model on a single machine (due to the algorithm is not Spark ready), and export the model to client prediction use. Therefore, I was searching for something else and able to use some existing Azure services to build up an easy-to-use workflow for me.

Azure Batch is a very useful service that you can manage VMs and run tasks among the VMs. It fits into my need naturally. To avoid the dependencies of running some Python training code, I notice docker container is another natural tool to help -- build all the dependencies and external service connections into the container and let Azure Batch to run container task in the VM. In this way, the VM managed by Azure Batch does not need to worry about the version of OS, dependencies etc. All we need to ensure is the docker container can be run correctly on the VM, which is a very simple step for Ubuntu or other Linux system. The same training container could accept different parameters and run as much as we want.

![](/images/ml-azure-batch.png)

We could also use external Azure Services such as Blob Storage to ensure a extremely fast data transfer speed. With Azure Blob Storage API, you could achieve transferring 25GB training dataset into docker container within 2 minutes. Note the `max_connection` parameter is critical to speed up the transferring.

```python
blob_service = BlockBlobService(account_name=account_name, account_key=account_key)
ata_blob = blob_service.get_blob_to_text(container_name, self.training_configuration.data_uri, max_connections=16)
data = pd.read_csv(StringIO(data_blob.content), sep="\t")
```

For the training code, I created a `Dockerfile` to put all the requried dependencies and code into a Ubuntu container. You can also see that external Azure Blob Storage service's connection info (AZURE_BLOB_KEY) can be built into the container as well. You just need to make sure you do not mistakenly check in the key into your Git repo.

```dockerfile
FROM ubuntu:16.04

RUN apt-get update && \
    apt-get install -y cmake build-essential gcc g++ git wget libgl1-mesa-glx

RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
RUN apt-get install -y --no-install-recommends msttcorefonts

# python-package
# miniconda
RUN wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh && \
    /bin/bash Miniconda3-latest-Linux-x86_64.sh -f -b -p /opt/conda && \
    export PATH="/opt/conda/bin:$PATH"

ENV PATH /opt/conda/bin:$PATH

RUN conda install -y numpy scipy scikit-learn pandas matplotlib

# azure storage
RUN pip install azure azure-storage

# clean
RUN apt-get autoremove -y && apt-get clean && \
    conda clean -i -l -t -y && \
    rm -rf /usr/local/src/*

# copy resource files
COPY . .

ENV AZURE_BLOB_KEY="[AZURE_BLOB_KEY]"

ENTRYPOINT [ "python", "train.py" ]
```

[Azure Batch Python SDK][2] provides enough resource for you to start and use the SDK, but I have to honestly say the Python SDK document is not maintained as good as the C# one. I have to find the corresponding C# documentation to understand the concept, then use the Python SDK to implement it.

To create a pool of VM, and pull your container, you can see the following snippet. At the start task, you will install docker in the Ubuntu machine, and pull the latest docker container. You also need to specify how many, and how big do you desire the VMs for. Azure Batch documentation claims they have docker ready VM images, but I failed to find it when I call the API and in Azure Portal. Therefore, I have to install docker community edition by myself below. For Windows container, there is a container ready Windows Server image to use.

```python
    batch_client = batch.BatchServiceClient(
        credentials,
        base_url=batch_service_url)

    sku_to_use, image_ref_to_use = select_latest_verified_vm_image_with_node_agent_sku(
            batch_client, 'Canonical', 'UbuntuServer', '16.04-LTS')

    vm_configuration = batchmodels.VirtualMachineConfiguration(
        image_reference=image_ref_to_use,
        node_agent_sku_id=sku_to_use)

    start_tasks = [
        "sudo apt-get update",
        "sudo apt-get -y install apt-transport-https ca-certificates curl software-properties-common",
        "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -",
        "sudo apt-key fingerprint 0EBFCD88",
        "sudo add-apt-repository \"deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable\"",
        "sudo apt-get update",
        "sudo apt-get -y install docker-ce",
        "sudo docker login {} -u {} -p {}".format(registry_server, registry_user_name, registry_password),
        "sudo docker pull myregistry.azurecr.io/ml/example:0.0.1"]
    tsks = batchmodels.StartTask(
        command_line=wrap_commands_in_shell("linux", start_tasks), 
        user_identity=batchmodels.UserIdentity(
            auto_user=batchmodels.AutoUserSpecification(
                scope=batchmodels.AutoUserScope.task, 
                elevation_level=batchmodels.ElevationLevel.admin)), 
        wait_for_success=True)

    pool_id = "pool_{}".format(instance_id)
    new_pool = batchmodels.PoolAddParameter(
        id=pool_id, 
        virtual_machine_configuration=vm_configuration,
        vm_size="Standard_E32_v3",
        target_dedicated_nodes=1, 
        start_task=tsks)

    try:
        batch_client.pool.add(new_pool)
    except batchmodels.batch_error.BatchErrorException as err:
        print_batch_exception(err)
```

To run the container task in Azure Batch, you can run the `Cloud Task`. You can also upload any logs or files to Azure Blob Storage as well with `output_files` being set. Once the task starts executing, you can go to Azure portal and check the running state of the task and pool. It depends on your training algorithm and dataset size to determine how long will you wait for the task to finish.

```python
    job_tasks = ["sudo docker run -t myregistry.azurecr.io/ml/example:0.0.1 {} {}".format(guid, training_id)]
    log_container_url = get_log_container_sas_url()

    task_id = "task_{}".format(instance_id)
    new_task = batchmodels.TaskAddParameter(
        id=task_id,
        command_line=wrap_commands_in_shell("linux", job_tasks),
        output_files=[
            batchmodels.OutputFile(
                "../std*.txt", 
                batchmodels.OutputFileDestination(container=batchmodels.OutputFileBlobContainerDestination(log_container_url, path=task_id)),
                batchmodels.OutputFileUploadOptions(batchmodels.OutputFileUploadCondition.task_completion))],
        user_identity=batchmodels.UserIdentity(
            auto_user=batchmodels.AutoUserSpecification(
                scope=batchmodels.AutoUserScope.task, 
                elevation_level=batchmodels.ElevationLevel.admin)))

    try:
        batch_client.task.add(job_id=job_id, task=new_task)
    except batchmodels.batch_error.BatchErrorException as err:
        print_batch_exception(err)

    # wait for task to finish.
    wait_for_tasks_to_complete(batch_client, job_id, datetime.timedelta(hours=6))
```

By the end of the training task, you can tear down the VMs and clean up everything so you will not be charged further more. Once you have the submit.py script ready, you will be able to submit your training job with multiple parameters in parallel in Azure.

```python
    batch_client.job.disable(job_id, "terminate")
    batch_client.pool.delete(pool_id)
```

### P.S

> Azure Batch service has a limit on the total cores to be used in the VM pools. So if you are running a big VM with mutliple parallel training, you will reach the cores limit. You need to contact Azure support team to increase the cores limit, so it could sustain your training capacity.

[1]: https://azure.microsoft.com/en-us/services/databricks/
[2]: https://docs.microsoft.com/en-us/azure/batch/batch-python-tutorial