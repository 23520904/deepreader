package com.deepreader.ai_service.service;

import com.deepreader.ai_service.config.QdrantProperties;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class EmbeddingService {

	private final int vectorSize;

	public EmbeddingService(QdrantProperties qdrantProperties) {
		this.vectorSize = Math.toIntExact(qdrantProperties.getVectorSize());
	}

	public List<Float> embed(String text) {
		float[] vector = new float[vectorSize];
		String normalized = text == null ? "" : text.toLowerCase();
		for (String token : normalized.split("\\W+")) {
			if (token.isBlank()) {
				continue;
			}
			int index = Math.floorMod(token.hashCode(), vectorSize);
			vector[index] += 1.0f;
		}

		normalize(vector);
		List<Float> values = new ArrayList<>(vector.length);
		for (float value : vector) {
			values.add(value);
		}
		return values;
	}

	private void normalize(float[] vector) {
		double sumSquares = 0.0d;
		for (float value : vector) {
			sumSquares += value * value;
		}
		if (sumSquares == 0.0d) {
			return;
		}
		float norm = (float) Math.sqrt(sumSquares);
		for (int i = 0; i < vector.length; i++) {
			vector[i] = vector[i] / norm;
		}
	}
}