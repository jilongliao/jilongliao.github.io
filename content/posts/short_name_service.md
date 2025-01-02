---
date: '2018-02-22'
draft: false
title: 'Fun at Work: Short Name Service'
tags: []
toc: true
---

My team at work runs an online service that a user can query their data from multiple dimension values. For exmaple, the user wants to see a data visualization based on `Dimension1=A`, `Dimension2=B` and so on. We used to have a fixed 10 to 20 dimensions so we put them in the URL hash when the user come to the page to visualize their data. 

Usually, you will see a URL like this: 

`https://myservice.com/myview#dimension1=A&dimension2=B&dimension3=C`

But the situation changed when we introduced a dynamic/custom dimensions into our system. In other words, the user can specify their own dimensions and values, and we will visualize them. Immediately we see a problem that the URL hash system is out of control because the custom dimensions and values could be anything (including URL not compatible characters) and the URL could easily get too long.

Since we cannot get rid of the URL hash due to the need of showing the same view when copy-and-paste URL, we choose a way to short the URL hash like this: 

`https://myservice.com/myview#dimensionSet=7syf4uUJhSD5TsMjrAWh63w93s1rgrmNvWJxEpWjq1XT`

The `dimensionSet` is not human readable but it is parsable within the system. Therefore, we can still showing the same view when we copy-and-paste the URL.

Multiple solutions are here but we considered the follow two options for performance, URL length, and storage perspectives.

## Option 1

The basic idea of option 1 is to use hashing algorithms. For each URL hash, it is equivalent to an JSON object (let's call it `original`). So if we do a `MD5(original)`, we actually map the object to a 128-byte space. The MD5 value is the key of the table and value is the original JSON object. Though MD5 is not cryptographically secure, we just need a digest of the original object to be a key. The probability of collision exists, but in our service's scenario, the probability is very low. To be URL compatible, we can use a [base-58 encoding][1] like bitcoin addresses or IPFS hashes. So the final key for the original object is `Base58(MD5(original))`.

NoSQL based database is a perfect fit for high performant and scalable read/write. We use [Azure Document DB][2] to power up our storage for this service. Due to the dimension values are sliding and changing, we can avoid storage over use by setting a TTL for each key-value pair. Good news is Azure Document DB supports it natively by adding a `_ttl` field in the document. An example document model is defined below.

```csharp
// Include a property that serializes to "ttl" in JSON
public class ShortNameDocument
{
    [JsonProperty(PropertyName = "id")]
    public string Id { get; set; }

    [JsonProperty(PropertyName="value")]
    public JToken Value { get; set; }

    // used to set expiration policy
    [JsonProperty(PropertyName = "ttl", NullValueHandling = NullValueHandling.Ignore)]
    public int? TimeToLive { get; set; }
}
```

## Option 2

Option 2 takes the first idea further by restricting the length of the short name to be 6-character such that the URL looks like this: 

`https://myservice.com/myview#dimensionSet=7sUf4Z`

At certain scenarios such as [bit.ly][3] you will need it. So using a 128-byte MD5 string is much longer than 6-character. We have to consider something else. A base-10 long integer is a good candidate for this. If we take the base-10 integer and convert it to a base-62 integer, it will be 6-character. The capacity of a 6-character base-62 encoded string can hold **56 billion** URLs, which is a lot of URLs we could shorten and store in the system. 

![Alt text](/images/option-2.png)

This approach needs to maintain an index of the table because it is the hash key. Given the size of the table could be billion rows, we will have to shard the table which makes makes tracking the index tricky. You can use an easy and thread-safe key-value store like Redis cache to store it. To avoid heavy load on the server for both insert and query, we can utilize browser's local storage to build a local key-value cache. Whenever a shorten dimension set has been applied, we can store it in the local storage because it is highly possible the user will come back and query the same dimension set again.

## Option 3

If we do not have a strict short URL length restriction of only a few characters, we could even improve the system's performance more. For example, if the max URL length we can tolerate is 256-character, we can then use a hybrid approach of both browser side and server side. First, we take a base-58 encoding of the JSON dimension set. If the encoded string length is less than 256 characters, we directly apply this to the URL hash. So even if you copy the URL to other people, the base-58 algorithms can decode the encoded the URL hash and get the dimension set. However, if the encoded length is bigger than 256 characters, we are use the hash digest and store to the server side. To find the best max URL length for the system, we dig into our [Application Insights][5] log and find the 95th percentile is about 512 length, so we choose 512 characters instead.

At the client side, the browser natively support some hash digest algorithms like `SHA-1` by using `window.SubtleCrypto`. Major browsers have supported this, so you should be okay to use it. 

```javascript
var crypto = window.SubtleCrypto;
var hash = crypto.subtle.digest(algo, buffer);
```

To enable base-58 encoding you can use [base-x][4] like below.

```javascript
var BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
var bs58 = require('base-x')(BASE58)

var decoded = bs58.decode('5Kd3NBUAdUnhyzenEwVLy9pBKxSwXvE9FMPyR4UKZvpe6E3AgLr')

console.log(decoded)
// => <Buffer 80 ed db dc 11 68 f1 da ea db d3 e4 4c 1e 3f 8f 5a 28 4c 20 29 f7 8a d2 6a f9 85 83 a4 99 de 5b 19>

console.log(bs58.encode(decoded))
// => 5Kd3NBUAdUnhyzenEwVLy9pBKxSwXvE9FMPyR4UKZvpe6E3AgLr
```


[1]: https://en.wikipedia.org/wiki/Base58
[2]: https://azure.microsoft.com/en-us/services/cosmos-db/?v=17.45b
[3]: https://bitly.com/
[4]: https://github.com/cryptocoinjs/base-x
[5]: https://azure.microsoft.com/en-us/services/application-insights/