// src/components/common/ResourceGrid.jsx (Nuevo Archivo)

import React from 'react';

/**
 * A generic grid component to render a list of resources (courses, lessons, etc.)
 * using a specified card component. It supports passing additional props to each
 * card and attaching a ref to the last item for infinite scrolling.
 *
 * @param {object} props
 * @param {Array<object>} props.items - The list of items to render.
 * @param {React.Component} props.ItemComponent - The card component to use for each item (e.g. CourseCard).
 * @param {object} props.itemProps - Additional props to pass to each ItemComponent.
 * @param {React.Ref} props.lastItemRef - The ref to attach to the last item for infinite scrolling.
 */
const ResourceGrid = ({ items, ItemComponent, itemProps, lastItemRef }) => {
  return (
    <>
      {items.map((item, index) => {
        const isLastElement = index === items.length - 1;

        // Pasa todas las props necesarias al componente de tarjeta
        const propsToPass = {
          key: item.id,
          ...itemProps,
          [itemProps.resourceName || 'item']: item, // ej. course={item} o lesson={item}
        };

        if (isLastElement) {
          return (
            <div key={item.id} ref={lastItemRef}>
              <ItemComponent {...propsToPass} />
            </div>
          );
        }

        return <ItemComponent {...propsToPass} />;
      })}
    </>
  );
};

export default ResourceGrid;