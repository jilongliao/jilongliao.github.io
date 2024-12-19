---
date: '2020-01-12T21:43:39-08:00'
draft: false
title: 'Scalable Timer Job in Azure WebJob'
tags: ["azure"]
toc: true
---


Our team operates a collection of services that heavily rely on Azure App Service. In addition, there are more than 60 periodical jobs running in the Azure App Services to do all kinds of tasks. For example, a task to upload metadata documents in Parquet format to Azure Data Lake Storage that data pipeline needs to process data. Some jobs run faster and some are slower at each time, and some jobs are more frequent while others are not. We use Azure WebJob SDK to build those jobs and deploy it in the Azure App Service.

It was a simple and elegant solution that Azure provides, until we encounter into a timer based job scalability issue. It turns out that Azure WebJob SDK's timer-based trigger jobs (see a sample code below which runs every 10 minutes) are all running on a single instance. In other words, if you have 4 machines allocated to the Azure App Service to run your job, only one is active. If any one of the 60 jobs run longer than expected or consumes excessive memory, all other jobs will start failing. 

```csharp
[Singleton]
public async Task PushMetadataJobAsync([TimerTrigger("00:10:00")]TimerInfo timer)
{
    // do some work here
}
```

Normally this does not happen until a few weeks ago.

## A Simple Idea

Azure support team suggests us to split the jobs into multiple job hosts so we can divide and conquer. In a weekly developer meeting, [my colleague Chandan](https://www.linkedin.com/in/chandan-jyoti-sharma-98711231/) and I had an idea to scale out timer-based job with or without splitting the code into multiple job hosts. The idea is as simple as below.

> Azure WebJobs also provide `ServiceBusTrigger` to invoke a job in addition to `TimerTrigger`, and it can run across all instances on the same App Service. It is very well load balanced. Therefore, we can create two jobs -- one is the timer trigger to enqueue a service bus message, and the other one is a service bus trigger job that does the actual work.

![Service Bus WebJob](/images/webjob-servicebus.png)

We created some dummy job and deployed to our CI environment. Our telemetry indicates that the `ServiceBusTrigger` job runs across all instances as expected. We can change the above `PushMetadataJobAsync` to the following code.

```csharp
[Singleton]
public async Task PushMetadataTimerTriggerJobAsync([TimerTrigger("00:10:00")]TimerInfo timer)
{
    using (var memoryStream = new MemoryStream(
        System.Text.Encoding.UTF8.GetBytes(
            JsonConvert.SerializeObject(
                new JobInfo { EnqueueTime = DateTimeOffset.Now.ToString()}))))
    {
        var reportMessage = new BrokeredMessage(memoryStream);
        reportMessage.Properties["Listener"] = "PushMetadataJobAsync";
        await topicClient.SendAsync(reportMessage);
    }
}

public async Task PushMetadataJobAsync([ServiceBusTrigger("jobs", "PushMetadataJobAsync")] string timer)
{
    // do real work here
}
```

Note that the listener property in the service bus message create a filter that only _listener=PushMetadataJobAsync_ would trigger the service bus job. We design this way to avoid creating lots of topic queues.

## Developer Experience

If we only have a few timer trigger jobs, we can manually edit it and we are done here. However, we have more than 60 jobs, and there will be more. Therefore, developer experience is very important here.

Our desired experience is to provide an attribute on the function then the code behind the scene handles everything for you. A sample code looks like below. Then all the 60 jobs could have a simple switch by replacing the attribute on the function as well as the function signature. A developer can probably convert all the job in 10 minutes.

```csharp
[ScalableTimerJob(Cron = "* 10 * * * *")]
public async Task PushMetadataJobAsync()
{
    // do work here
}
```

To achieve the goal above, we need some code to dynamically register a new timer job when job host starts as well as a service bus job. The service bus job need to execute the same code in the above function.

The first piece is to programmatically register the service bus subscriptions and its associated rules. In our design, we use the same topic queue, but with different subscriptions and each subscription use a SQL filter to filter the message it is going to receive. The code below shows how to register such a subscription in service bus. Note that `$Default` rule has a default SQL filter `1=1` which does not filter anything. Therefore, we need to delete it at creation time.

```csharp
public async void RegisterJob(string jobName)
{
    managementClient = new ManagementClient(ServiceBusConnectionString);
    await managementClient.CreateSubscriptionAsync(new Microsoft.Azure.ServiceBus.Management.SubscriptionDescription(topic, jobName));
    var rules = await managementClient.GetRulesAsync(topic, jobName);

    if (rules.Any(r => r.Name == "$Default"))
    {
        await managementClient.DeleteRuleAsync(topic, jobName, "$Default");
    }

    if (!rules.Any(r => r.Name == jobName))
    {
        await managementClient.CreateRuleAsync(topic, jobName, new Microsoft.Azure.ServiceBus.RuleDescription
        {
            Filter = new Microsoft.Azure.ServiceBus.SqlFilter($"(Listener='{jobName}')"),
            Name = jobName
        });
    }
}
```

Unfortunately, Azure WebJobs does not allow us to dynamically register new timer triggered jobs once the job host starts. After the code `app.UseTimer()`, all the timer jobs are permanently fixed. We were surprised by this design so we have to find an alternative way to register the job before `app.UseTimer()` gets called.

We researched into this a little bit more and find out there is no other runtime based solution except for compile time code generation. In other words, we need to dynamically generate a timer trigger job and a service bus trigger job before the code build. Then `app.UseTimer()` will pick up those generated jobs at runtime.

The solution is described below:

1. Create a `.tt` text template file to generate the C# code.
2. `.tt` file has C# code to scan and parse all the job C# files in the project via `Rosyln`.
3. The generated timer trigger job just sends a service bus message to a topic queue with a subscription value same as the full function name, e.g. `DummyJob.JobOneAsync`.
4. The generated service bus trigger job will call the original job function to do the actual work. The original job function is instantiated via dependency injection. 
5. The `csproj` file needs to add a `PreCompile` task to call `TextTransform.exe` (provided by Visual Studio build tools) to generate the C# code.
6. Project gets build by `msbuild` or `dotnet build` command. The DLLs should contain the two generated trigger jobs.

One issue comes out of this design is that we lost the singleton property of the timer job. If a job is scheduled very frequently and one job is running late so there are multiple same jobs running at the same time. Classic WebJob will not let this happen because it's a singleton running on single machine. 

Fortunately, service bus trigger function job will delete the message only if the job finished running, either success or failure. Therefore, we can use this nature as the distributed lock. So we can create a function to check if there is an existing job running like below.

```csharp
public async Task<bool> IsJobRunning(string subscription)
{
    return (await managementClient.GetSubscriptionRuntimeInfoAsync(topic, subscription)).MessageCount > 0;
}
```

Next, in the timer trigger job, we can use `IsJobRunning` to decide whether to send message to service bus.

```csharp
if(!await this.scalableTimerConfiguration.IsJobRunning("DummyJob.ExampleJob"))
{
	using (var memoryStream = new MemoryStream(
        System.Text.Encoding.UTF8.GetBytes(
            JsonConvert.SerializeObject(
                new JobInfo{ EnqueueTime = DateTimeOffset.Now.ToString()}))))
    {
        var reportMessage = new BrokeredMessage(memoryStream);
        reportMessage.Properties["Listener"] = "DummyJob.ExampleJob";
		await topicClient.SendAsync(reportMessage);
	}
}
```

To ensure the C# file gets generated before the build, a new build target needs to be added to the `csproj` file.

```xml
<PropertyGroup>
    <TextTransformExe Condition="Exists('C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\Common7\IDE\TextTransform.exe')">C:\Program Files (x86)\Microsoft Visual Studio\2017\Enterprise\Common7\IDE\TextTransform.exe</TextTransformExe>
    <TextTransformExe Condition="Exists('C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise\Common7\IDE\TextTransform.exe')">C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise\Common7\IDE\TextTransform.exe</TextTransformExe>
</PropertyGroup>
<Target Name="TextTransform" BeforeTargets="BeforeCompile" Condition="'$(OS)' == 'Windows_NT'">
    <Exec Command="echo.&gt;Jobs\GeneratedTimerJob.cs" />
    <Exec Command="&quot;$(TextTransformExe)&quot; -out Jobs\GeneratedTimerJob.cs -I Jobs -P Resources Jobs\GeneratedTimerJob.tt" Condition="Exists($(TextTransformExe))" />
</Target>
```

A caveat we discovered here is that you need the following DLLs in a folder as assembly reference path to `TextTransformer.exe`. This is because `.tt` file relies on _Rosyln_ to parse all the job files.

* `Microsoft.CodeAnalysis.CSharp.dll`
* `Microsoft.CodeAnalysis.CSharp.Syntax.dll`

At this point, the design should give us enough scalability on our jobs. If we ever seen instances out of memory or running excessively heavy again, we can just simply add new instances to the App Service. 