// export const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
//   const toRad = (value) => (value * Math.PI) / 180;

//   const R = 6371; // Earth radius in KM

//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);

//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) *
//       Math.cos(toRad(lat2)) *
//       Math.sin(dLon / 2) *
//       Math.sin(dLon / 2);

//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   const distance = R * c;

//   return distance; // in KM
// };

import axios from "axios";
export const getDistanceInKm = async (
  originLat,
  originLng,
  destLat,
  destLng,
) => {
  try {
    const apiKey = process.env.GOOGLE_MAP_API_KEY

    const url = "https://maps.googleapis.com/maps/api/distancematrix/json";

    const response = await axios.get(url, {
      params: {
        origins: `${originLat},${originLng}`,
        destinations: `${destLat},${destLng}`,
        key: apiKey,
      },
    });

    // console.log("Google Distance API Response:", response.data);
    const element = response?.data?.rows?.[0]?.elements?.[0];
    // console.log(element);

    if (!element || element.status !== "OK") {
      return {
        distanceKm: 0,
        distanceMeter: 0,
        durationText: "",
        durationSecond: 0,
      };
    }
    return {
      distanceKm: Number(element.distance.value / 1000),
      distanceMeter: Number(element.distance.value),
      durationText: element.duration.text,
    };
  } catch (error) {
    // console.log("Google Distance API Error:", error.message);
    return {
      distanceKm: 0,
      distanceMeter: 0,
      durationText: "",
    };
  }
};


export const calculateDistanceAndDuration = (
  userLat,
  userLng,
  vendorLat,
  vendorLng,
) => {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371; // Earth radius in KM

  const dLat = toRad(vendorLat - userLat);
  const dLng = toRad(vendorLng - userLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(userLat)) *
      Math.cos(toRad(vendorLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInKm = R * c;

  // Approx delivery duration
  // Average speed = 30 KM/H
  const durationInMinutes = Math.ceil(
    (distanceInKm / 30) * 60,
  );

  return {
    distanceInKm: Number(distanceInKm.toFixed(2)),
    durationInMinutes,
  };
};