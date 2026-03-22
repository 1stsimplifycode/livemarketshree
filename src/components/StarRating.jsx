import React from 'react';

export default function StarRating({ rating, size = 14 }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ color: '#FF9900', fontSize: size, letterSpacing: '-1px', lineHeight: 1 }}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
      <span style={{ color: '#565959', marginLeft: '4px', fontSize: size - 2 }}>{rating}</span>
    </span>
  );
}
