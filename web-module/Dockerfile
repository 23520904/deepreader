FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
COPY core/pom.xml core/pom.xml
COPY data-service/pom.xml data-service/pom.xml
COPY ai-service/pom.xml ai-service/pom.xml
COPY core/src core/src
COPY business-service/pom.xml business-service/pom.xml
COPY business-service/src business-service/src
COPY web-module/pom.xml web-module/pom.xml
COPY web-module/src web-module/src
RUN mvn -q -pl web-module -am package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/web-module/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java","-jar","/app/app.jar"]
