package com.deepreader.web_module.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Service responsible for sending email messages from DeepReader.
 *
 * <p>Currently this service is used to send OTP verification emails.
 */
@Service
public class EmailDeliveryService {
	private final JavaMailSender mailSender;
	private final String username;
	private final String configuredFrom;
	private final String fromName;

	public EmailDeliveryService(
			JavaMailSender mailSender,
			@Value("${spring.mail.username:}") String username,
			@Value("${deepreader.mail.from:}") String configuredFrom,
			@Value("${deepreader.mail.from-name:DeepReader}") String fromName
	) {
		this.mailSender = mailSender;
		this.username = username;
		this.configuredFrom = configuredFrom;
		this.fromName = fromName;
	}

	/**
	 * Sends an OTP email to the given recipient.
	 *
	 * <p>The sender address is resolved from configuration, and the email includes
	 * the expiration time so users know how long the code is valid.
	 */
	public void sendOtp(String recipient, String code, String subject, int ttlMinutes) {
		if (!StringUtils.hasText(username) && !StringUtils.hasText(configuredFrom)) {
			throw new IllegalArgumentException("SMTP email is not configured.");
		}

		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

			// Use UTF-8 so the sender name and message content are encoded correctly.
			helper.setFrom(new InternetAddress(resolveFromEmail(), resolveFromName(), StandardCharsets.UTF_8.name()));
			helper.setTo(recipient);
			helper.setSubject(subject);
			helper.setText("""
					Your DeepReader verification code is %s.

					This code expires in %d minutes. If you did not request this code, you can ignore this email.
					""".formatted(code, ttlMinutes));

			mailSender.send(message);
		} catch (MailException | MessagingException | UnsupportedEncodingException ex) {
			// Hide low-level mail errors from callers and return a clear configuration-related message.
			throw new IllegalArgumentException("Could not send verification email. Check SMTP settings.", ex);
		}
	}

	/**
	 * Resolves the email address used in the From header.
	 */
	private String resolveFromEmail() {
		return StringUtils.hasText(configuredFrom) ? configuredFrom.trim() : username.trim();
	}

	/**
	 * Resolves the display name used in the From header.
	 */
	private String resolveFromName() {
		return StringUtils.hasText(fromName) ? fromName.trim() : "DeepReader";
	}
}