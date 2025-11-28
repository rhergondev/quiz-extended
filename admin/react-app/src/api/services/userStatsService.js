import { makeApiRequest } from './baseService';
import { getApiConfig } from '../config/apiConfig';

const getBaseUrl = () => {
  const config = getApiConfig();
  return config.endpoints?.custom_api || `${config.api_url}/quiz-extended/v1`;
};

export const getUserQuestionStats = async (courseId, lessonId = null) => {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}/user-stats/questions?course_id=${courseId}`;
  if (lessonId) {
    url += `&lesson_id=${lessonId}`;
  }
  const { data } = await makeApiRequest(url);
  return data;
};

export const getPerformanceByLesson = async (courseId) => {
  const baseUrl = getBaseUrl();
  const { data } = await makeApiRequest(`${baseUrl}/user-stats/performance-by-lesson?course_id=${courseId}`);
  return data;
};

export const getWeakSpots = async (courseId) => {
  const baseUrl = getBaseUrl();
  const { data } = await makeApiRequest(`${baseUrl}/user-stats/weak-spots?course_id=${courseId}`);
  return data;
};

export const getDifficultyStats = async (courseId) => {
  const baseUrl = getBaseUrl();
  const { data } = await makeApiRequest(`${baseUrl}/user-stats/difficulty-matrix?course_id=${courseId}`);
  return data;
};

export const getScoreEvolution = async (courseId, period = 'week', lessonId = null) => {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}/user-stats/score-evolution?course_id=${courseId}&period=${period}`;
  if (lessonId) {
    url += `&lesson_id=${lessonId}`;
  }
  const { data } = await makeApiRequest(url);
  return data;
};
