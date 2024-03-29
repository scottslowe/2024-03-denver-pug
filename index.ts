import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";

const config = new pulumi.Config();
const openApiKey = config.get("open-api-key") || "CHANGEME";

const appLabels = {
    "app.kubernetes.io/name": "langserve",
    "app.kubernetes.io/managed-by": "pulumi",
    "event": "denver-pug",
};

// Create an ECR repository to store the image
const current = aws.getCallerIdentityOutput({});
const pulumiProject = pulumi.getProject();
const pulumiStack = pulumi.getStack();
const demoRepository = new aws.ecr.Repository("demo-repository", {
    name: `${pulumiProject}-${pulumiStack}`,
    forceDelete: true,
});
const token = aws.ecr.getAuthorizationTokenOutput({
    registryId: demoRepository.registryId,
});
const accountId = current.apply(current => current.accountId);
const demoLifecyclePolicy = new aws.ecr.LifecyclePolicy("demo-lifecycle-policy", {
    repository: demoRepository.name,
    policy: JSON.stringify({
        rules: [{
            rulePriority: 1,
            description: "Expire images when they are more than 10 available",
            selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 10,
            },
            action: {
                type: "expire",
            },
        }],
    }),
});

// Build an image and upload to demo repository
const demoImage = new docker.Image("demo-image", {
    build: {
        platform: "linux/amd64",
        context: ".",
        dockerfile: "./Dockerfile",
    },
    imageName: demoRepository.repositoryUrl,
    registry: {
        server: demoRepository.repositoryUrl,
        username: token.apply(token => token.userName),
        password: pulumi.secret(token.apply(token => token.password)),
    },
});

// Create a Kubernetes namespace for the application
const demoNs = new k8s.core.v1.Namespace("demo-ns", {
    metadata: {
        labels: appLabels,
        name: "demo-ns",
    },
});

// Create a ConfigMap to store environment variables for the app
const demoCm = new k8s.core.v1.ConfigMap("demo-cm", {
    metadata: {
        labels: appLabels,
        name: "demo-cm",
        namespace: demoNs.metadata.name,        
    },
    data: {
        OPENAI_API_KEY: openApiKey,
    },
});

// Create a Kubernetes deployment
const demoDeployment = new k8s.apps.v1.Deployment("demo-deployment", {
    metadata: {
        labels: appLabels,
        name: "demo-deployment",
        namespace: demoNs.metadata.name,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: appLabels
        },
        template: {
            metadata: {
                labels: appLabels
            },
            spec: {
                containers: [{
                    envFrom: [{
                        configMapRef: {
                            name: demoCm.metadata.name,
                        },
                    }],
                    image: demoImage.repoDigest,
                    name: "demo-app",
                    ports: [{
                        containerPort: 8080,
                    }],
                }],
            },
        },
    },
});

const demoService = new k8s.core.v1.Service("demo-service", {
    metadata: {
        labels: appLabels,
        name: "demo-service",
        namespace: demoNs.metadata.name,
    },
    spec: {
        ports: [{
            name: "http",
            port: 80,
            protocol: "TCP",
            targetPort: 8080,
        }],
        selector: appLabels,
        type: "LoadBalancer",
    },
});

export const name = demoDeployment.metadata.name;
