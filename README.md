# March 2024 Denver Pulumi User Group (PUG): Deploying LangChain Apps on AWS

This repository contains the sample code and the slides from the March 2024 Denver Pulumi User Group (PUG) meeting. The title of the presentation was "Deploying LangChain Apps on AWS".

The slides for the presentation are in the file `slides.pdf`.

The code in this repository is based on [this Pulumi example](https://github.com/pulumi/examples/tree/master/aws-ts-langserve).

## Trying it out yourself

To deploy the very simple LangChain app (using LangServe) in this repository, you'll need:

* An OpenAI API key
* Pulumi installed and logged into a backend
* Access to a running Kubernetes cluster (you can run `kubectl` commands successfully against the cluster)
* NodeJS installed

Follow these steps:

1. Clone the repository down to your system.
2. Change into the directory where the repository was cloned.
3. Run `pulumi stack init` to create a new stack.
4. Run `pulumi config set open-api-key <api-key>` to set your OpenAI API key
5. Run `pulumi up` to build the container image, push to an Amazon ECR repository, and deploy to your Kubernetes cluster.
6. Use `kubectl -n demo-ns get svc` to get the DNS name or IP address of the cloud load balancer created to expose the application.
7. Access `http://<dns-name-or-ip-of-lb>/openai/playground` to see the application

When you're finished, just run `pulumi destroy` to tear down the Kubernetes infrastructure and Amazon ECR repository.

Enjoy!
