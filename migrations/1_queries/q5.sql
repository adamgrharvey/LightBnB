SELECT DISTINCT reservations.id, properties.title, properties.cost_per_night, start_date, 
(
  SELECT avg(property_reviews.rating) as average_rating
FROM properties
LEFT JOIN property_reviews ON properties.id = property_id
WHERE property_reviews.property_id = reservations.property_id
) 
as average_rating 
FROM reservations
JOIN properties ON reservations.property_id = properties.id
JOIN property_reviews ON reservations.property_id = property_reviews.property_id
WHERE reservations.guest_id = 1
ORDER BY start_date
LIMIT 10;