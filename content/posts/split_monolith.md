---
date: '2019-09-03'
draft: false
title: 'Splitting a ASP.NET Core Monolithic Service'
tags: ["scalability"]
toc: true
---


Recently our team worked on a project to split a giant monolithic service into a few self-contained service areas. I did one area and learned a lot from the experience which I plan to share in this blog.

The original monolithic service our team has is a combination of 6 different areas. We follow the [ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/?view=aspnetcore-2.2) pattern to build different component services that different areas can re-use like a function call. To be honest, I really like the simplicity of simple dependency injection and call a function from a shared class. However, we found the entire thing is getting bigger and bigger. Different areas have different workload as well. So we have seen a few severity 1 incidents that one REST API call takes the entire service down. Small incidents are happening every week so the productivity of the team dropped as well. In addition, it's difficult to maintain a code base that people don't know where to put their code because different areas are contributed by a few teams with diverse patterns and folder structures. Finally, developer experience sucks due to the **slowness** of everything from open solution in Visual Studio, build, debug and deployment. So we made the call to split the giant thing so that everybody is happier.

However, we did not go to micro-service fully for a few reasons: 1) it is a much bigger rewrite for the system that the ROI may not be high plus a potential long executing timeline; 2) our services are more area isolated except for a few common services so full micro-service architecture may be just an overkill for the business.

Therefore, we decided to scope the project to split the monolithic service into different areas plus some common services as its own service or component. Given this scope, we finished the entire process in 6 months.

## Topology Redesign

When our service is monolithic, the deployment is very straightforward that Azure App Service provides a simple scalable and reliable solution. But we still have a few deployments for UX serving, service account serving and job serving. Those three deployments have very different load and only execute part of the monolithic app code.

When the services are split, we will only deploy part of the monolithic code to each deployment environment. Each area's service will be served from a different domain as the following.

* Area 1: area1.contoso.com/api1
* Area 2: area2.contoso.com/api2
* Area 3: ...

However, we do not want to interrupt our customers who does not need to know we are going to change the internal topology of the service. For our customers, the URLs are the following.

* Area 1: www.contoso.com/area1/api1
* Area 2: www.contoso.com/area2/api2
* Area 3: ...

Hence, we introduced a `router` as the gateway in front of all services. The router will route the traffic from conventional REST APIs to the corresponding area service. There are multiple open source gateways such [nigix](https://www.nginx.com/) and [istio](https://istio.io/). Since our team needs some very special routing mechanism, so we wrote our own router. Otherwise, I would not recommend doing so.

## Dependency Graph and Refactoring

Our monolithic service has a very complicated dependency graph. For example, we have a `WebRequestService` which handles all kinds of request to different partner services and our internal services with the correct authentication and authorization. This service is used almost everywhere. We don't want to make a copy to each micro-services and get the centralized component out-of-sync as different services evolve.

So we identified a few conceptual group of classes and components that could be shared by other services, for example, authentication, authorization, caching, Azure CosmosDB access layer etc. Then we group them into four independent nuget packages. The nuget packages might have dependencies to some other packages. 

Usually, the ASP.NET Core application uses `appsettings.json` to provide parameter information. Services within the nuget packages depend on the `appsettings.json` from each individual micro-services. Therefore, the convention we have is to use the same `appsettings.json` structure for the shared components. This may not be ideal, but this does minimize our cost and make it easy for people to split their services by just copy and paste most of the `appsettings.json` in the monolithic application.

One pain point of this approach we have been observing is the debugging experience when we want to make a change to the shared nuget packages. Because the code is isolated from the each individual services but interfaced by the versioned nuget packages. It's more than just a function call and we can debug into it very easily. At the bright side, we only change the shared nuget once in a few months, so it is an okay approach for now.

In addition, we have a few jobs that runs as Azure App Service's web jobs. Those jobs used to depends on some classes directly are switched to relies on REST interfaces to the actual services. The job becomes a simple CRON time triggered thin layer to call into a REST API where the real business logic happens.

## Plan the Changes

The monolithic services we have is contributed by a lot of people from many different areas. So making the split becomes a challenge to logistics such as when and how much to change each time. The service I was responsible has 7 to 8 people constantly working on different features. Therefore, my goal was to minimize the disturbance of people's normal development. 

A good communication to the team ahead of time is very important. Not everyone can be updated what I am trying to do on the same day. So I used opportunities such as dev sync meetings to broadcast the message. For the service I was responsible for, I broke the entire migration process into four big pull requests. Only one of the four PRs having lots of class file changes which may be a miserable merge for people. So our team find a good time so we merge in that PR and everybody did a pull from `master` branch. Other PRs are not intrusive changes, so it's okay for people to merge at their own convenience.

## Testing, Validation, Deployment and Rollback

Before I complete the PR, I use a fantastic tool developed by one of my teammates to replay all the relevant REST API calls from the last 24 hours production environment. The tool uses our telemetry data from [Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview) to populate a list of REST API calls, then play that against my local environment or CI environment, and generate a report by the end of the test. It reduces my integration test efforts a lot. 

Most common issue I encountered at testing is **dependency injection** related **NullReferenceException**. Due to the deep dependency link, it was very easy to miss some tiny component and the code will fail to create an instance of that component. I wish I had some static code analysis tools first to run this check before I start testing anything. It can be time costly to find out exactly which one cause the problem, but only through exhaustive log reading.

Since we split the service into some micro-services, we create CI/CD pipeline for each of them and gets triggered only by folder path and branch names. I have observe the build are much faster because I do not need to build unrelated stuff.

Finally, it's time to bring the new service online. So I prepared the deployment instance and configured the routing policy before I deploy the new code. Instead, I hook up with our monolithic CI/CD pipeline first to deploy a full monolithic service there to ensure the instance is running good and routing is also good. So if the new code failed on production, we know we need to rollback quickly and it's very quick by swapping the slots in Azure App Service. This can minimize the potential downtime for our customers.

> Kubernetes, do you need it?
> </kbd>
> Personally, I'm a [Kubernetes](https://kubernetes.io/) fan that I want to use it almost everywhere. I see how easy it is to configure and operationalize services and applications. However, it may not fit for your team and project. First of all, the learning curve is not low, so you need some knowledge base in your team. Second, [Azure App Service](https://azure.microsoft.com/en-us/services/app-service/) or AWS equivalent provides great developer experience and scalability management and monitoring. Unless you have lots of customized stuff or Azure App Service does not satisfy your needs, it's simpler to just stick with Azure App Service. 
> </kbd>
> So back to my case, Azure App Service is good enough and our services are not running at a hyper-scale nor in a container based environment yet. To fit into our scope and timeline, Azure App Service is probably the best choice.