package com.deepreader.data_service.repository.user.impl;

import com.deepreader.core.model.User;
import com.deepreader.data_service.repository.user.UserRepositoryCustom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.regex.Pattern;

@Repository
@RequiredArgsConstructor
@Slf4j
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final ReactiveMongoTemplate mongoTemplate;

    @Override
    public Flux<User> searchUsers(String keyword) {
        String escapedKeyword = Pattern.quote(keyword);

        Query query = new Query();
        query.addCriteria(new Criteria().orOperator(
                Criteria.where("fullName").regex(escapedKeyword, "i"),
                Criteria.where("email").regex(escapedKeyword, "i")
        ));

        return mongoTemplate.find(query, User.class);
    }

    @Override
    public Mono<Long> countUsersCreatedInRange(String startDate, String endDate) {
        try {
            DateTimeFormatter dateFormatter = DateTimeFormatter.ISO_DATE;

            LocalDateTime start = LocalDate.parse(startDate, dateFormatter).atStartOfDay();

            LocalDateTime end = LocalDate.parse(endDate, dateFormatter)
                    .atTime(23, 59, 59, 999_999_999); // fix precision

            log.info("Thống kê User từ {} đến {}", start, end);

            Query query = new Query(
                    Criteria.where("createdAt")
                            .gte(start)
                            .lte(end)
            );

            return mongoTemplate.count(query, User.class);

        } catch (Exception e) {
            log.error("Lỗi định dạng ngày: start={}, end={}", startDate, endDate);
            return Mono.error(new RuntimeException(
                    "Ngày không hợp lệ. Định dạng đúng: yyyy-MM-dd"
            ));
        }
    }
}