import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

const CourseCard = ({ course }) => {
  const { id, title, excerpt, _embedded } = course;
  
  const imageUrl = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
  
  const renderedTitle = title || 'Curso sin título'; 
  const renderedExcerpt = (excerpt || '').replace(/<[^>]+>/g, '');

  return (
    <Link 
      to={`/courses/${id}`} 
      className="flex flex-col bg-white shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl"
      // CAMBIO: Aumentamos el min-height para que la tarjeta sea más larga y el texto respire
      style={{ minHeight: '380px' }} 
    >
      {/* --- PARTE SUPERIOR (MARCO AZUL CON FORMA INVERTIDA) --- */}
      <div 
        className="relative bg-primary flex-shrink-0" // Añadido flex-shrink-0 para que no se encoja
        // CAMBIO: Invertimos el ángulo del clip-path
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 94% 90%, 6% 90%, 0 100%)' }}
      >
        {/* CAMBIO: Más padding a la imagen (p-5 en lugar de p-3) */}
        <div className="p-7">
          <div className="relative w-full pb-[56.25%] bg-gray-700 overflow-hidden">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={renderedTitle} 
                className="absolute top-0 left-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* --- PARTE INFERIOR (BLANCA CON TEXTO AZUL) --- */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-primary text-white w-full p-4 text-center">
          <h3 
            className="font-semibold text-lg"
            dangerouslySetInnerHTML={{ __html: renderedTitle }} 
          />
          {renderedExcerpt && (
            <p className="text-sm text-gray-200 mt-2 line-clamp-2">
              {renderedExcerpt}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;