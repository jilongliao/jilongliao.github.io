---
date: '2019-01-18'
draft: false
title: 'Boradcast Variable in Spark SQL'
tags: ["spark"]
toc: true
---

Over the holiday I spent some time to make some progress of moving one of my machine learning project into Spark. An important piece of the project is a data transformation library with pre-defined functions available. The original implementation uses `pandas dataframe` and runs on a single machine. Given the size of our data gets much bigger, sometimes we have to use a giant 512GB memory Azure VM to run the transformation and it takes a long time to run the entire transformation or I have chunk the data then transform in batches (which is not a good idea for column based transformation such as feature normalization). Another blocking issue is the intermediate memory consumption can be really high -- 10x of the original data size. 

So I decided to give Spark a try since I do not have to move data around once I put the data into Azure Blob Storage.

<!-- more -->

Setting up a local Spark environment might take you an hour by following some good articles such as [this one][1], so I will skip from this one.

I spent about a week to re-write all the transformation function in Spark using PySpark. The purpose of the library is to use a common JSON based configuration interface to trigger the same data transformation in cloud and on edge devices. Most of the transformations are simply numerical ones and are very easy to implement. The performance is very good comparing to the single machine solution.

However, the categorical feature transformations give me a difficult time to make it performant. An example transformation needs a mapping dictionary like below.

```json
{
    "categoricalMaps": [
        {
            "name": "AppNameEncoding",
            "map": {
                "chrome.exe": 1,
                "notepad.exe": 2
            }
        }
    ]
}
```

This categorical mapping is simply a dictionary check like the following code, and I wrap the function into a Spark UDF function so that I can apply the transformation in SparkSQL.

```python
def __map(value, mappingObj, defaultValue):
    if value is None:
        return default
    elif value in mappingObj:
        return mappingObj[value]
    else:
        return mappingObj["__other__"]

def __transform_string_to_number(df, output_col_name, input_col_name, mappingObj, default_output):
    return df.withColumn(
        output_col_name,
        udf(__map, IntegerType())(col(input_col_name), lit(mappingObj), lit(default_output)))
```

When I test it on Spark with 4 `Standard_DS3_v2` (14GB memory, 4 Cores) workers, it takes about **26 minutes** to run a 1GB dataset. Unbelievably slow!

The root issue here is that I have a very large categorical mappings (about 700kb) and the above code basically copy and move this 700kb tiny bookmark table for every single row in the dataset which is more than 3 million times. In total, we are moving and playing a 2.1TB dataset rather than a 1GB dataset. That's why the performance is terrible.

I consulted a Spark expert in my team and he suggests me to look at [Spark Broadcast Variables][2]. So I am not the first guy encounters into this problem and people have a solution already. Very cool! You will also find the similar concept such as `boradcast join` in a MapReduce-like system to achieve better performance. Below is a picture to show you the concept.

![Broadcasting a value to executors](https://miro.medium.com/v2/resize:fit:1400/format:webp/0*hVV5E7QsM3EPSIBq.png)

So I use the broadcast variables to update my implementation a little bit like below. First, I broadcast the mapping dictionary and store it in a variable, then the UDF just need to accept the name of the mapping and retrieve the actual map from the worker directly. This tiny map dictionary is only moved to 4 workers once, so we are still dealing with a 1GB dataset. The programming management concept shows in below.

```python
boradcast_variables["example_variable"] = spark_context.broadcast(example_map)

def __map(value, mappingObjName, defaultValue):
    mappingObj = boradcast_varaibles[mappingObjName].value
    if value is None:
        return default
    elif value in mappingObj:
        return mappingObj[value]
    else:
        return mappingObj["__other__"]

def __transform_string_to_number(df, output_col_name, input_col_name, mappingObj_name, default_output):
    return df.withColumn(
        output_col_name,
        udf(__map, IntegerType())(col(input_col_name), lit(mappingObj_name), lit(default_output)))
```

With this improvement, my test shows the transformation only takes less than **20 seconds** -- siganificantly faster! 

Better performance gain, Spark also provides [Accumulators][3], which I would recommend you to read as well.

To know more of Spark SQL, you can also checkout this gitbook -- [The Internals of Spark SQL][4].

[1]: https://medium.com/@GalarnykMichael/install-spark-on-windows-pyspark-4498a5d8d66c
[2]: http://spark.apache.org/docs/latest/rdd-programming-guide.html#broadcast-variables
[3]: http://spark.apache.org/docs/latest/rdd-programming-guide.html#accumulators
[4]: https://jaceklaskowski.gitbooks.io/mastering-spark-sql/content/