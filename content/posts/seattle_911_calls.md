---
date: '2014-07-04'
draft: false
title: 'How about the 911 Calls in Seattle?'
tags: ["data"]
toc: true
---


> Many of us would like to understand a city through its culture, business, people, and history. But here, I would like see a city that I am living through a new angle by looking at the 911 calls in seattle area.

<!-- more -->

Very fortunately I have a chance to look at the `911 call` data (both fire and police department) in the city of Seattle. The [data.seattle.gov][1] provides developers and scientists a complete access to their public data source. Among my current explore, I find the 911 call data is a very interesting angle to observe the city. The data I explored is roughly from 2011 till now and it has two parts: fire and police. In each of the data set, they record every event's reason, time and location point.

<script type="text/javascript" src="https://www.google.com/jsapi"></script>
<script type="text/javascript" src="/js/911calls.js"></script>

The first one I am interested in is the distribution of the categories classified by the fire and police department. If we look at the fire department's call analysis, we can clearly see the majority of the call dispatch is `Aid Response` and `Medic Response`. It shows a very good long-tail distribution that the top 7 or 8 categories covers more than 90% of the total response.

<div class="charts" id="categorybarchart"></div>

On the other hand, if we look at the police department's data, we can see the top one is `suspicious circumstances` which makes me believe people living in Seattle is very cautious and sensitive to around. Then, the `tranffic related call` just remind me the bad traffic every afternoon on I-405, and that's one of the major reason I choose to take buses so that I can spend the one hour per day trip on my reading. Thereafter, `Parking Violation` and `Liquor Violation` are the next top two which is pretty interesting. I know people like drinking but parking violation seems to be new to me. In general, the police department's call data distribution is more gradually decreased than the fire department, which gives a sense of the diversity of the different kind of violations and criminal situations.

<div class="charts" id="categorybarchartpolice"></div>

More interestingly, if we look at the call interval (the time between two consequent calls) distribution, we can see the more than 90% of the 911 call dials in within 10 minutes after the previous one finish. Hm.. This sound a little bit frequent. If we break down the call in different month, we can have a even better idea. As we can see from November to June next year, the most frequent interval is 2 minutes. However, July, August, September and October just jump up to every single minute. What happens during these 4 months? Maybe I will have the answer after I live here for a full year.

<div class="charts" id="intervallinechart"></div>

Additionally, I extract the top 6 categories in the fire department's call. Clearly, the top categories' pattern fit into the July to October patterns, because the 1 minute call interval is the most frequent one. So can we guess these top 6 categories play an important role to boost the call interval from July to October? I don't have the answer right now, but I will dig out more information validate this.

<div class="charts" id="intervallinechartcategory"></div>

The other part of the story is that I use the same strategy to break down the police department's data. The call interval of police department's data shows great consistent pattern that surprises me a lot. No jitters at any given month which infers a stable police related environment in Seattle. However, we need to know that 90% of the call is made within 6 minutes after the previous call was made, comparing to the 8 minutes in the fire department's data.

<div class="charts" id="intervallinepolicechart"></div>

Although we think the big picture of the police related environment is pretty stable, unfortunately, there are categories seems to be more frequent than any other categories: `Parking Violation` and `Liquor Violation`. These two categories are not the top 2 (only half quantity of the top 2) so that it tells us these two types of violations are more aggregated when it happens. In other words, you usually receive multiple calls in a short time or the similar situation happens simultaneously around Seattle area.

<div class="charts" id="intervallinechartcategorypolice"></div>

[1]: https://data.seattle.gov