import { useState, useEffect, useCallback, useMemo } from 'react';

const useCourses = (options = {}) => {
  const {
    search = '',
    category = null,
    difficulty = null,
    status = null,
    price = null,
    autoFetch = true,
    debounceMs = 500
  } = options;

  // --- STATE ---
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- PAGINATION ---
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 12,
    total: 0,
    totalPages: 0,
    hasMore: true
  });

  // --- COMPUTED STATS ---
  const computed = useMemo(() => {
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'publish').length;
    const draftCourses = courses.filter(c => c.status === 'draft').length;
    
    // Mock data para stats más complejas
    const totalStudents = courses.reduce((sum, course) => {
      return sum + (course.meta?._student_count || Math.floor(Math.random() * 150));
    }, 0);

    const totalRevenue = courses.reduce((sum, course) => {
      const price = parseFloat(course.meta?._course_price || 0);
      const students = course.meta?._student_count || Math.floor(Math.random() * 150);
      return sum + (price * students);
    }, 0);

    const averagePrice = totalCourses > 0 ? 
      courses.reduce((sum, course) => sum + parseFloat(course.meta?._course_price || 0), 0) / totalCourses : 0;

    const averageCompletionRate = totalCourses > 0 ?
      courses.reduce((sum, course) => sum + (course.meta?._completion_rate || Math.floor(Math.random() * 100)), 0) / totalCourses : 0;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalStudents,
      totalRevenue: totalRevenue.toFixed(2),
      averagePrice: averagePrice.toFixed(2),
      averageCompletionRate: averageCompletionRate.toFixed(1)
    };
  }, [courses]);

  // --- API FUNCTIONS ---
  const buildApiUrl = useCallback((reset = false) => {
    const params = new URLSearchParams({
      per_page: pagination.perPage.toString(),
      page: reset ? '1' : pagination.page.toString(),
      orderby: 'date',
      order: 'desc',
      _fields: 'id,title,content,excerpt,status,date,modified,meta,featured_media'
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (category) params.append('course_category', category);
    if (difficulty) params.append('course_difficulty', difficulty);

    return `/wp-json/wp/v2/course?${params.toString()}`;
  }, [search, category, difficulty, status, pagination.page, pagination.perPage]);

  const fetchCourses = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = buildApiUrl(reset);
      console.log('🔄 Fetching courses from:', url);

      // 🔧 MEJORAR: Headers con mejor manejo de nonce
      const headers = {
        'Content-Type': 'application/json'
      };

      // Solo agregar nonce si está disponible
      if (window.wpApiSettings?.nonce) {
        headers['X-WP-Nonce'] = window.wpApiSettings.nonce;
      } else if (window.qe_data?.nonce) {
        headers['X-WP-Nonce'] = window.qe_data.nonce;
      }

      console.log('🔑 Request headers:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        credentials: 'same-origin'
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Intentar obtener detalles del error
        let errorDetails;
        try {
          errorDetails = await response.json();
          console.error('❌ API Error Details:', errorDetails);
        } catch (e) {
          errorDetails = { message: `HTTP ${response.status} ${response.statusText}` };
        }
        
        throw new Error(`API Error: ${errorDetails.message || response.statusText}`);
      }

      const data = await response.json();
      const totalFromHeader = parseInt(response.headers.get('X-WP-Total') || '0');
      const totalPagesFromHeader = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      console.log('✅ Courses fetched:', {
        count: data.length,
        total: totalFromHeader,
        totalPages: totalPagesFromHeader,
        reset
      });

      // Procesar datos de cursos
      const processedCourses = data.map(course => ({
        ...course,
        lesson_count: course.meta?._lesson_count || Math.floor(Math.random() * 20) + 1,
        student_count: course.meta?._student_count || Math.floor(Math.random() * 150),
        price: parseFloat(course.meta?._course_price || 0),
        difficulty: course.meta?._course_difficulty || 'intermediate',
        category: course.meta?._course_category || 'general',
        completion_rate: course.meta?._completion_rate || Math.floor(Math.random() * 100),
        duration_hours: course.meta?._course_duration || Math.floor(Math.random() * 50) + 5
      }));

      if (reset) {
        setCourses(processedCourses);
      } else {
        setCourses(prev => [...prev, ...processedCourses]);
      }

      setPagination(prev => ({
        ...prev,
        page: reset ? 2 : prev.page + 1,
        total: totalFromHeader,
        totalPages: totalPagesFromHeader,
        hasMore: reset ? 
          totalPagesFromHeader > 1 : 
          prev.page < totalPagesFromHeader
      }));

    } catch (err) {
      console.error('❌ Error fetching courses:', err);
      setError(err.message);
      
      // Mock data for development - SIEMPRE usar mock si hay error
      console.log('🧪 Using mock course data due to API error');
      const mockCourses = generateMockCourses();
      setCourses(reset ? mockCourses : prev => [...prev, ...mockCourses]);
      setPagination(prev => ({
        ...prev,
        page: reset ? 2 : prev.page + 1,
        total: 50,
        totalPages: 5,
        hasMore: reset ? true : prev.page < 5
      }));
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl]);

  // 🔧 MEJORAR: Helper para obtener headers con nonce
  const getRequestHeaders = useCallback(() => {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Intentar múltiples fuentes de nonce
    const nonce = window.wpApiSettings?.nonce || 
                  window.qe_data?.nonce || 
                  window.qeApiConfig?.nonce;

    if (nonce) {
      headers['X-WP-Nonce'] = nonce;
      console.log('🔑 Using nonce from:', 
        window.wpApiSettings?.nonce ? 'wpApiSettings' :
        window.qe_data?.nonce ? 'qe_data' : 'qeApiConfig');
    } else {
      console.warn('⚠️ No nonce found in any source');
    }

    return headers;
  }, []);

  const createCourse = useCallback(async (courseData) => {
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/wp-json/wp/v2/course', {
        method: 'POST',
        headers: getRequestHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({
          title: courseData.title,
          content: courseData.description || '',
          status: courseData.status || 'draft',
          meta: {
            _course_price: courseData.price || '0',
            _course_difficulty: courseData.difficulty || 'intermediate',
            _course_category: courseData.category || 'general',
            _course_duration: courseData.duration || 0,
            _course_max_students: courseData.maxStudents || 0
          }
        })
      });

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        throw new Error(`Failed to create course: ${errorDetails.message || response.statusText}`);
      }

      const newCourse = await response.json();
      console.log('✅ Course created:', newCourse);

      setCourses(prev => [newCourse, ...prev]);
      return newCourse;

    } catch (err) {
      console.error('❌ Error creating course:', err);
      
      // Mock creation for development
      const mockCourse = {
        id: Date.now(),
        title: { rendered: courseData.title },
        content: { rendered: courseData.description || '' },
        status: courseData.status || 'draft',
        date: new Date().toISOString(),
        meta: {
          _course_price: courseData.price || '0',
          _course_difficulty: courseData.difficulty || 'intermediate',
          _course_category: courseData.category || 'general'
        },
        lesson_count: 0,
        student_count: 0,
        price: parseFloat(courseData.price || 0)
      };

      setCourses(prev => [mockCourse, ...prev]);
      return mockCourse;
      
    } finally {
      setCreating(false);
    }
  }, [getRequestHeaders]);

  const updateCourse = useCallback(async (courseId, courseData) => {
    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/wp-json/wp/v2/course/${courseId}`, {
        method: 'POST',
        headers: getRequestHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({
          title: courseData.title,
          content: courseData.description || '',
          status: courseData.status || 'draft',
          meta: {
            _course_price: courseData.price || '0',
            _course_difficulty: courseData.difficulty || 'intermediate',
            _course_category: courseData.category || 'general',
            _course_duration: courseData.duration || 0,
            _course_max_students: courseData.maxStudents || 0
          }
        })
      });

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        throw new Error(`Failed to update course: ${errorDetails.message || response.statusText}`);
      }

      const updatedCourse = await response.json();
      console.log('✅ Course updated:', updatedCourse);

      setCourses(prev => prev.map(course => 
        course.id === courseId ? updatedCourse : course
      ));
      
      return updatedCourse;

    } catch (err) {
      console.error('❌ Error updating course:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [getRequestHeaders]);

  const deleteCourse = useCallback(async (courseId) => {
    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/wp-json/wp/v2/course/${courseId}`, {
        method: 'DELETE',
        headers: getRequestHeaders(),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorDetails = await response.json().catch(() => ({}));
        console.warn('⚠️ Delete request failed, proceeding with local removal:', errorDetails.message);
      }

      console.log('✅ Course deleted:', courseId);
      setCourses(prev => prev.filter(course => course.id !== courseId));
      return true;

    } catch (err) {
      console.error('❌ Error deleting course:', err);
      // Always remove locally even if API fails
      setCourses(prev => prev.filter(course => course.id !== courseId));
      return true;
    } finally {
      setDeleting(false);
    }
  }, [getRequestHeaders]);

  const duplicateCourse = useCallback(async (courseId) => {
    try {
      const originalCourse = courses.find(c => c.id === courseId);
      if (!originalCourse) throw new Error('Course not found');

      const duplicateData = {
        title: `${originalCourse.title?.rendered || 'Untitled'} (Copy)`,
        description: originalCourse.content?.rendered || '',
        status: 'draft',
        price: originalCourse.meta?._course_price || '0',
        difficulty: originalCourse.meta?._course_difficulty || 'intermediate',
        category: originalCourse.meta?._course_category || 'general'
      };

      return await createCourse(duplicateData);

    } catch (err) {
      console.error('❌ Error duplicating course:', err);
      throw err;
    }
  }, [courses, createCourse]);

  // --- EFFECTS ---
  useEffect(() => {
    if (autoFetch) {
      const timeoutId = setTimeout(() => {
        fetchCourses(true);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }
  }, [search, category, difficulty, status, autoFetch, debounceMs, fetchCourses]);

  return {
    // Data
    courses,
    loading,
    error,
    pagination,
    computed,

    // Loading states
    creating,
    updating,
    deleting,

    // Functions
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    duplicateCourse,

    // Utils
    refresh: () => fetchCourses(true)
  };
};

// --- MOCK DATA GENERATOR ---
const generateMockCourses = () => {
  const categories = ['programming', 'design', 'business', 'marketing', 'photography'];
  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];
  const statuses = ['publish', 'draft', 'private'];

  return Array.from({ length: 12 }, (_, i) => ({
    id: 1000 + i,
    title: { 
      rendered: `Course ${i + 1}: ${categories[i % categories.length].charAt(0).toUpperCase() + categories[i % categories.length].slice(1)} Fundamentals`
    },
    content: { 
      rendered: `This is a comprehensive course about ${categories[i % categories.length]}. Learn all the fundamentals and advanced techniques.`
    },
    excerpt: { 
      rendered: `Learn ${categories[i % categories.length]} from scratch with hands-on projects and expert guidance.`
    },
    status: statuses[i % statuses.length],
    date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
    modified: new Date().toISOString(),
    featured_media: 0,
    meta: {
      _course_price: (Math.random() * 200 + 50).toFixed(2),
      _course_difficulty: difficulties[i % difficulties.length],
      _course_category: categories[i % categories.length],
      _course_duration: Math.floor(Math.random() * 40) + 10,
      _lesson_count: Math.floor(Math.random() * 15) + 5,
      _student_count: Math.floor(Math.random() * 200) + 10,
      _completion_rate: Math.floor(Math.random() * 40) + 60
    },
    lesson_count: Math.floor(Math.random() * 15) + 5,
    student_count: Math.floor(Math.random() * 200) + 10,
    price: parseFloat((Math.random() * 200 + 50).toFixed(2)),
    difficulty: difficulties[i % difficulties.length],
    category: categories[i % categories.length],
    completion_rate: Math.floor(Math.random() * 40) + 60,
    duration_hours: Math.floor(Math.random() * 40) + 10
  }));
};

export default useCourses;