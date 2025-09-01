// admin/react-app/src/api/categoriesApi.js

/**
 * API service for managing course categories from WordPress taxonomies
 */

const { api_url, nonce } = window.qe_data || {};

/**
 * Get all available course categories from WordPress taxonomies
 * Using multiple approaches to get the most complete list
 */
export const getCourseCategories = async () => {
  try {
    // Method 1: Try to get from qe_category taxonomy (if it exists)
    let categories = [];
    
    try {
      const taxonomyResponse = await fetch(`${api_url}/wp/v2/qe_category?per_page=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
      });
      
      if (taxonomyResponse.ok) {
        const taxonomyData = await taxonomyResponse.json();
        categories = taxonomyData.map(term => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
          count: term.count || 0
        }));
      }
    } catch (e) {
      console.log('qe_category taxonomy not available, trying alternative methods');
    }

    // Method 2: If no taxonomy categories, get unique categories from course meta
    if (categories.length === 0) {
      const coursesResponse = await fetch(`${api_url}/wp/v2/course?per_page=100&_fields=id,meta`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce,
        },
        credentials: 'same-origin',
      });

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        const uniqueCategories = new Set();
        
        coursesData.forEach(course => {
          if (course.meta?._course_category && course.meta._course_category.trim()) {
            uniqueCategories.add(course.meta._course_category.trim());
          }
        });

        categories = Array.from(uniqueCategories).map((name, index) => ({
          id: `meta_${index}`,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          count: 0 // We could calculate this but it's not critical
        }));
      }
    }

    // Method 3: Fallback to default categories if nothing else works
    if (categories.length === 0) {
      const defaultCategories = [
        "Web Development",
        "Backend Development", 
        "Frontend Development",
        "Full Stack",
        "DevOps",
        "Design",
        "Data Science",
        "Mobile Development",
        "Security"
      ];

      categories = defaultCategories.map((name, index) => ({
        id: `default_${index}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        count: 0
      }));
    }

    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('✅ Categories loaded:', categories);
    return categories;

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    return [];
  }
};

/**
 * Create a new category (if using taxonomy)
 */
export const createCourseCategory = async (categoryData) => {
  try {
    const response = await fetch(`${api_url}/wp/v2/qe_category`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        name: categoryData.name,
        slug: categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-'),
        description: categoryData.description || ''
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create category: ${response.statusText}`);
    }

    const newCategory = await response.json();
    console.log('✅ Category created:', newCategory);
    
    return {
      id: newCategory.id,
      name: newCategory.name,
      slug: newCategory.slug,
      count: newCategory.count || 0
    };
  } catch (error) {
    console.error('❌ Error creating category:', error);
    throw error;
  }
};

/**
 * Get category statistics (count of courses per category)
 */
export const getCategoryStats = async () => {
  try {
    const coursesResponse = await fetch(`${api_url}/wp/v2/course?per_page=100&_fields=id,meta`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      credentials: 'same-origin',
    });

    if (!coursesResponse.ok) {
      throw new Error('Failed to fetch courses for stats');
    }

    const coursesData = await coursesResponse.json();
    const categoryStats = {};

    coursesData.forEach(course => {
      const category = course.meta?._course_category;
      if (category && category.trim()) {
        categoryStats[category.trim()] = (categoryStats[category.trim()] || 0) + 1;
      }
    });

    return categoryStats;
  } catch (error) {
    console.error('❌ Error fetching category stats:', error);
    return {};
  }
};