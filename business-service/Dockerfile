FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml ./
COPY core/pom.xml core/pom.xml
COPY core/src core/src
COPY business-service/pom.xml business-service/pom.xml
COPY business-service/src business-service/src
RUN mvn -q -pl business-service -am package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/business-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java","-jar","/app/app.jar"]