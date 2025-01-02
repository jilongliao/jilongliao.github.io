---
date: '2019-07-15'
draft: false
title: 'Spark Performance Optimization'
tags: ["spark"]
toc: true
---


At Spark+AI conference this year, Daniel Tomes from Databricks gave a deep-dive talk on Spark performance optimizations. After watching it, I feel it's super useful, so I decide to write down some important notes which address the most common performance issues from his talk.

Here is the YouTube video just in case if you are interested.
<iframe width="560" height="315" src="https://www.youtube.com/embed/daXEp4HmS-E?si=ewmwfeOG6XhQ2nEV" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Paritions

We often encounter into situations that partition is not optimal at different stages of our workflow, so it slows down the entire job siganificantly. For example, six month ago I tried to analyze some telemetry data exported from Application Insights, but there are way to many JSON files (> 100,000 files) and each file is small (< 1MB each). This makes a `groupBy` stage takes an hour to finish on 8 machines. If this is a one-time workflow, I'm okay to not optimize it. But it's not.

Spark's default shuffle repartition is 200 which does not work for data bigger than 20GB. So from Daniel's talk, there is a golden equation to calculate the partition count for the best of performance.

The largest shuffle stage target size should be less than **200MB**. So the partition count calculate as total size in MB divide 200.

> Note: your cluster size matters as well. If your number of cores in your cluster is smaller than the partitions calculated above, you should use the number of cores. The reason is that you don't want to waste cores during the second round of shuffle though you slightly increase the parition file size. However, if your cores are bigger than partition count from above, you might want to reduce your cluster size so that other people can benefit from it. You can also bump the partitions up to make it even faster.

To change the shuffle partition size, use the code below.

```python
spark.conf.set("spark.sql.shuffle.partitions", 1600)
```

Spark partition file size is another factor you need to pay attention. The default size is 128MB per file. When you output a DataFrame to `dbfs` or other storage systems, you will need to consider the size as well. So the rule of thumbs given by Daniel is the following.

Use spark default 128MB max partition bytes unless:
- You need to increase parallelism
- You have heavily nested / repetitive data
- You have data generation such as `explode()` function.
- The source structure is not optimal.
- When you use UDF functions.

To change the max partition bytes, use the code below.

```python
spark.conf.set("spark.sql.files.maxPartitionBytes", 16777216)
```

When you output files, there are many options provided by Spark, but you need to know what you are doing.

#### Control Max Record Per File
```python
df.write.option("maxRecordsPerFile", n)
```
This is useful to control partitions by the records per file.

#### Coalesce
```python
df.coalesce(n).write(...)
```
This is useful to size down the partitions. For example, the 100,000 files down to 16 files.

#### Repartition
```python
df.repartition(n).write(...)
```
This is very expensive, do not use it until you really need to.

```python
df.repartition(n, [colA, ...]).write(...)
```
This is required when you have a `groupBy` or `join` etc. later in your workflow. This will boost the performance a lot.

```python
df.localCheckpoint(...).repartition(n).write(...)
```
This is very helpful as it breaks the stage barrier so the parallel workflow later that uses the same DataFrame do not need to re-process the current DataFrame. Remember Spark is lazy execute, `localCheckpoint()` will trigger execution to materialize the DataFrame.

> Finding imbalancing is one of the most important thing in parallel processing.

## Persisting

If you have repetitions from your SQL plan, you can persist the DataFrame so the subsequent processing could use a materialized data. You can either use `df.cache()` and `df.persist(level)`. They are doing the same thing, it's just different levels. When the workflow finished, remember to clean up by calling `df.unpersist()`. Spark is not smart enough to automatically clean up the data for you.

## Join Optimization

Boradcast join if possible, but do not over use it. Broadcast join is a good technique to speed up the join. The following diagram shows you how it works.

![Broadcast Join](https://henningkropponlinede.files.wordpress.com/2016/12/spark-broadcast.png)

A few things you need to pay attention when use broadcast join.

- DataFrame is bigger than the driver node's available working memory.
- DataFrame is bigger than `spark.driver.maxResultSize`.
- DataFrame is bigger than executor's available working memory.

## Handling Skew

Assume you have a DataFrame that is skewed towards certain city and state. If we need aggregate some data, we need might expect long tail execution.

```scala
df.groupBy("city", "state").agg(<f(x)>).orderBy(col.desc)
```

Databricks has an internal solution to skewed data join. 

Spark community solution is the following to add a salt to be a random value between 0 and `spark.sql.shuffle.partitions - 1`, then run the `groupBy` and aggregation.

```scala
val saltVal = random(0, spark.conf.get("org...shuffle.partitions") - 1)
df
    .withColumn("salt", lit(saltVal))
    .groupBy("city", "state", "salt")
    .agg(<f(x)>)
    .drop("salt")
    .orderBy(col.desc)
```

> Use the Apache namespace random function as it's a vectorized random function.

## Avoid Expensive Operations

Try to avoid the following expensive operations:
- `repartition()`. Use `coalesce()` or shuffle partition count instead.
- `count()`. Do not call it unless you need.
- `distinctCount()`. Use `approxCountDistinct()` instead if you can tolerate 5% error.
- If distincts are required, put them in the right place.
- - Use `dropDuplicates()` and use it before join and groupBy.

## UDF Penalties

Traditional UDFs cannot use project [Tungsten](https://databricks.com/blog/2015/04/28/project-tungsten-bringing-spark-closer-to-bare-metal.html) to improve the efficiency of Spark executions. Instead, you can choose the following options.

- Use `spark.sql.functions` standard functions to solve your problem.
- Use Pandas UDF which utilizes Apache Arrow.
- Use SparkR UDF.

> Rule of thumbs is to use vectorized UDFs.