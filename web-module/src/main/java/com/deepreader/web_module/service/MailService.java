package com.deepreader.web_module.service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {
	private final JavaMailSender mailSender;
	private final String from;

	public MailService(JavaMailSender mailSender, @Value("${deepreader.mail.from}") String from) {
		this.mailSender = mailSender;
		this.from = from;
	}

	public void sendVerificationOtp(String email, String otp) {
		sendTextEmail(
				email,
				"DeepReader Email Verification",
				"""
				Your DeepReader verification code is: %s

				This code expires in 10 minutes.
				""".formatted(otp),
				"Could not send verification email. Please try again."
		);
	}

	public void sendPasswordResetOtp(String email, String otp) {
		sendTextEmail(
				email,
				"DeepReader Password Reset",
				"""
				Your DeepReader password reset code is: %s

				This code expires in 10 minutes.
				""".formatted(otp),
				"Could not send password reset email. Please try again."
		);
	}

	private void sendTextEmail(String email, String subject, String body, String errorMessage) {
		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
			helper.setFrom(InternetAddress.parse(from, false)[0]);
			helper.setTo(email);
			helper.setSubject(subject);
			helper.setText(body);
			mailSender.send(message);
		} catch (Exception ex) {
			throw new IllegalArgumentException(errorMessage, ex);
		}
	}
}
