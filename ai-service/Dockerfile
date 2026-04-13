FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
COPY core/pom.xml core/pom.xml
COPY data-service/pom.xml data-service/pom.xml
COPY business-service/pom.xml business-service/pom.xml
COPY web-module/pom.xml web-module/pom.xml
COPY ai-service/pom.xml ai-service/pom.xml
COPY core/src core/src
COPY ai-service/src ai-service/src
RUN mvn -q -pl ai-service -am package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/ai-service/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]