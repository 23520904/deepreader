# syntax=docker/dockerfile:1.7
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
COPY core/pom.xml core/pom.xml
COPY data-service/pom.xml data-service/pom.xml
COPY ai-service/pom.xml ai-service/pom.xml
COPY business-service/pom.xml business-service/pom.xml
COPY web-module/pom.xml web-module/pom.xml
RUN --mount=type=cache,target=/root/.m2 mvn -pl web-module -am dependency:go-offline
COPY core/src core/src
COPY web-module/src web-module/src
RUN --mount=type=cache,target=/root/.m2 mvn -q -pl web-module -am package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/web-module/target/*.jar app.jar
RUN chown app:app app.jar
USER app
EXPOSE 8083
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
