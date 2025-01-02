---
date: '2018-08-09'
draft: false
title: 'Reduce Docker Image Size for Machine Learning'
tags: ["docker"]
toc: true
---

In my [previous blog][1], I proposed a way to easily run large scale machine learning task in cloud using Docker container and Azure Batch. I also use this approach at work for some of my projects. One thing I start realizing is the size of the contianer image can grow very quickly as we add more functionality into the ML training task.

Use open source tools such as scikit-learn, nltk etc. will bring additional dependencies into the container image. For example, some of us may use [mini conda][2], but it can easily introduce a few hundred MBs into the docker container image. The Ubuntu 16.04 base image is about 120MB, then very quickly I start seeing my container image size go beyond 1GB, then 3GB after install some other tools.

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

# lightgbm
RUN git clone --recursive https://github.com/Microsoft/LightGBM && \
    cd LightGBM/python-package && python setup.py install

# clean
RUN apt-get autoremove -y && apt-get clean && \
    conda clean -i -l -t -y && \
    rm -rf /usr/local/src/*

# copy resource files
COPY . .

ENV ACR_KEY="[ACR_KEY]"
ENV AZURE_BLOB_KEY="[AZURE_BLOB_KEY]"

ENTRYPOINT [ "python", "cloud.py" ]
```

Azure Batch's starting task gets longer and longer because it needs signifcantly more time to pull the image of 3G than a few MBs. Therefore, I decided to reduce the container image size.

## Reduce Layers

The first try is to reduce layers in the Dockerfile above. For example, combine those `RUN` command together could reduce a lot of layers which leads to smaller container size. But the size is still 2.x GB. What's next?

```dockerfile
RUN apt-get update && \
    apt-get install -y cmake build-essential gcc g++ git wget libgl1-mesa-glx && \
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections && \
    apt-get install -y --no-install-recommends msttcorefonts && \
    wget https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh && \
    /bin/bash Miniconda3-latest-Linux-x86_64.sh -f -b -p /opt/conda && \
    export PATH="/opt/conda/bin:$PATH"

ENV PATH /opt/conda/bin:$PATH

RUN conda install -y numpy scipy scikit-learn pandas matplotlib && \
    pip install azure azure-storage && \
    git clone --recursive https://github.com/Microsoft/LightGBM && \
    cd LightGBM/python-package && python setup.py install && \
    apt-get autoremove -y && apt-get clean && \
    conda clean -i -l -t -y && \
    rm -rf /usr/local/src/*
```

## Remove Uncessary Dependencies

The Dockerfile above install mini conda, but eseentially we only use the standard Python library plus numpy, scipy etc. in the `conda install` command. Obviously, this is a big chunk to remove. So we decided to use a Python base image from Debian. This save us about 1GB of space and the image size is now 1.3GB. In this round, we will have to specify which version of numpy, scipy etc. runs because some newer version, such as numpy 1.14.3 is not compatible with matplotlib at runtime. Though this brings challenge to debug and match the right version, while mini conda does this for you, it still worth the effort of reducing 1GB of the size.

```dockerfile
FROM python:3.6.6-slim-stretch

RUN apt-get update \
    && apt-get install -y --no-install-recommends libatlas-base-dev gfortran cmake build-essential git tk \
    && echo "deb http://httpredir.debian.org/debian jessie main contrib" > /etc/apt/sources.list \
    && echo "deb http://security.debian.org/ jessie/updates main contrib" >> /etc/apt/sources.list \
    && echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections \
    && apt-get update \
    && apt-get install -y --no-install-recommends ttf-mscorefonts-installer \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    numpy==1.14.2 \
    scipy==1.0.1 \
    scikit-learn==0.19.1 \
    pandas==0.22.0 \
    matplotlib==2.2.2 \
    azure \
    azure-storage==0.36.0 \
    py-multibase==0.1.2 \
    wheel \
    lightgbm

# lightgbm
# RUN git clone --recursive https://github.com/Microsoft/LightGBM && \
#     cd LightGBM/python-package && python setup.py install

# clean
RUN apt-get autoremove -y && apt-get clean && \
    rm -rf /usr/local/src/*

# copy resource files
COPY . .

ENV ACR_KEY="[ACR_KEY]"
ENV AZURE_BLOB_KEY="[AZURE_BLOB_KEY]"

ENTRYPOINT [ "python", "cloud.py" ]
```

## Go Beyond 1GB

At this point, I only install the libs I really need at runtime so it reaches a minimal point of image size. But I still wonder if I can break the 1GB limit. There is a way! [Alpine Linux Project][3] offers a 5MB bare minimal linux environment to start with. Yes, it is 5mb, comparing to 115MB ubuntu image. Python also has a base image for alpine `python:3.6-alpine` which is 75MB, comparing to 918MB of Ubuntu Python image. If I can use Alpine Linux, I am reducing another big chunk. 

Since Alpine linux has its own package management system, it took me some time to satisfy all the dependencies to build and install all my dependencies and make LightGBM running the same as Ubuntu container. Now the size is 834MB. This blog's effort saves 2.5GB overhead for Azure Batch's starting task of pulling container images.

```dockerfile
FROM python:3.6-alpine

RUN apk update && \
	apk add --no-cache \
    # bash \
    libstdc++ \
    libgomp \
    build-base \
    cmake \
    gfortran \
    libpng && \
    ln -s locale.h /usr/include/xlocale.h && \
    apk add --no-cache --virtual .build-deps \
    lapack-dev \
    musl-dev \
    python3-dev \
    jpeg-dev \
    freetype-dev \
    libffi-dev \
    openssl-dev \
    g++ && \
    pip install --no-cache-dir \
    numpy==1.14.2 \
    scipy==1.0.1 \
    scikit-learn==0.19.1 \
    pandas==0.22.0 \
    matplotlib==2.2.2 \
    azure-storage==0.36.0 \
    py-multibase==0.1.2 \
    wheel \
    lightgbm

# RUN apk del .build-deps

COPY . .

ENV ACR_KEY="[ACR_KEY]"
ENV AZURE_BLOB_KEY="[AZURE_BLOB_KEY]"

ENTRYPOINT [ "python", "cloud.py" ]
```

[1]: https://jilongliao.com/2018/05/28/container-ml-azure-batch/
[2]: https://conda.io/miniconda.html
[3]: https://alpinelinux.org/