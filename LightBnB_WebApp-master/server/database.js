const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});



/// Users
// password is password

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
  .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then((result) => {
      return (result.rows[0]);
    })
    .catch((err) => {
      return (err.message);
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool
  .query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((result) => {
      return (result.rows[0]);
    })
    .catch((err) => {
      return (err.message);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const values = [`${user.name}`, `${user.password}`, `${user.email}`]
  const queryString = `
  INSERT INTO users (
  name, email, password) 
  VALUES (
  $1, $3, $2)
  RETURNING *;
  `;
  return pool
  .query(queryString, values)
    .then((result) => {
      return (result.rows[0]);
    })
    .catch((err) => {
      console.log(err.message);
      return (err.message);
    });

}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const values = [`${guest_id}`, limit]

  const queryString = `
    SELECT reservations.*, properties.*, avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1
    GROUP BY properties.id, reservations.id
    ORDER BY reservations.start_date
    LIMIT $2;
  `
  return pool
  .query(queryString, values)
    .then((result) => {
      return(result.rows);
    })
    .catch((err) => {
      console.log(err.message);
      return (err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
 const getAllProperties = function (options, limit = 10) {
  console.log('options', options, 'limit', limit);
  // 1
  const queryParams = [];

  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  // IF CITY
  console.log('queryString',queryString, 'queryParams',queryParams);
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
    // IF CITY AND PRICE RESTRICTIONS
    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night)*100);
      queryString += `AND cost_per_night >= $${queryParams.length} `
      queryParams.push(Number(options.maximum_price_per_night)*100);
      queryString += `AND cost_per_night <= $${queryParams.length} `
    }
    else if (options.minimum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night)*100);
      queryString += `AND cost_per_night >= $${queryParams.length} `
    }
    else if (options.maximum_price_per_night) {
      queryParams.push(Number(options.maximum_price_per_night)*100);
      queryString += `AND cost_per_night <= $${queryParams.length} `
    }
  } else {
  // IF NO CITY AND THERE ARE PRICE RESTRICTIONS
    if (options.minimum_price_per_night && options.maximum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night)*100);
      queryString += `WHERE cost_per_night >= $${queryParams.length} `
      queryParams.push(Number(options.maximum_price_per_night)*100);
      queryString += `AND cost_per_night <= $${queryParams.length} `
    }
    if (options.minimum_price_per_night && !options.maximum_price_per_night) {
      queryParams.push(Number(options.minimum_price_per_night)*100);
      queryString += `WHERE cost_per_night >= $${queryParams.length} `
    }
    if (options.maximum_price_per_night && !options.minimum_price_per_night) {
      queryParams.push(Number(options.maximum_price_per_night)*100);
      queryString += `WHERE cost_per_night <= $${queryParams.length} `
    }
  }

    // IF SHOWING OWN 
    if (options.owner_id) {
      queryParams.push(`${options.owner_id}`);
      queryString += `WHERE owner_id = $${queryParams.length}`;
    }
  
  queryString += `
  GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `
  HAVING avg(property_reviews.rating) >= $${queryParams.length} `
  }


  console.log('queryString',queryString, 'queryParams',queryParams);

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  

  // 5
  console.log('queryString',queryString, 'queryParams',queryParams);


  // 6
  return pool
  .query(queryString, queryParams)
  .then((res) => { 
    return (res.rows)
  })
};

exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const values = [
  `${property.owner_id}`,
  `${property.title}`,
  `${property.description}`,
  `${property.thumbnail_photo_url}`,
  `${property.cover_photo_url}`,
  `${property.cost_per_night}`,
  `${property.parking_spaces}`,
  `${property.number_of_bathrooms}`,
  `${property.number_of_bedrooms}`,
  `${property.country}`,
  `${property.street}`,
  `${property.city}`,
  `${property.province}`,
  `${property.post_code}`
  ]
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code) 
  VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;
  `;
  return pool
  .query(queryString, values)
    .then((result) => {
      console.log(result.rows[0])
      return (result.rows[0]);
    })
    .catch((err) => {
      console.log(err.message);
      return (err.message);
    });




  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
}
exports.addProperty = addProperty;
