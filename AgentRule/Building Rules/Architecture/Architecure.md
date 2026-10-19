# Types of Architecture

## Simple MVC
Src
|-Controllers
|-models
|-routes
|-middleware
|-app.ts
|-server.ts

## MVC + Services 
Src
|-Controllers
|-services
|-repositories
|-models
|-routes
|-middleware
|-validators
|-utils
|-config

## Feature based structure
Src
|-modules
|   |-auth
|   |-users
|   |-product
|   |-orders

## Clean Structure
Src
|-Domain
|-application
|-infrastructure
|-interfaces

## Microservices architecture
services
|-auth-services
|-payment-service
|-notification-service
|-user-service