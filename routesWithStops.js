const fs = require("fs");
const _ = require("lodash");

// The stop_times.txt file contains the relationship between trips and stops.
// Without this, stops that belong to a certain route cannot be determined.
// The problem is that this file is huge and contains a lot of data that is not needed.
// This script reads the stop_times.txt file and creates a new file that contains only the data needed.
// It is run once while the stop_times.txt file is in the same directory.
// The stop_times.txt file is then deleted.

// Data is then read from the routeStops.json file.

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function getCollection(filename) {
  return readJson(filename);
}

function getRoutesWithTripIds(dir) {
  const routes = getCollection(`${dir}/routes.json`);
  const trips = getCollection(`${dir}/trips.json`);
  const routesWithTripIds = routes.map((route) => {
    const routeTripIds = trips
      .filter((trip) => trip.route_id === route.route_id)
      .map((trip) => trip.trip_id);
    return {
      route_id: route.route_id,
      trip_ids: routeTripIds,
    };
  });
  return routesWithTripIds;
}

function getTripsWithStopIds(dir) {
  const stopTimes = getCollection(`${dir}/stop_times.json`);
  const groupedStopTimes = _.groupBy(stopTimes, "trip_id");
  const tripsWithStopIds = Object.keys(groupedStopTimes).map((trip_id) => {
    const stopTimes = groupedStopTimes[trip_id];
    const stop_ids = stopTimes.map((stopTime) => stopTime.stop_id);
    return {
      trip_id,
      stop_ids,
    };
  });
  return tripsWithStopIds;
}

function getStopIds(routes, trips) {
  const routeStopIds = routes.trip_ids.map((trip_id) => {
    const tripStopIds = trips.find(
      (trip) => trip.trip_id === trip_id
    )?.stop_ids;
    return tripStopIds || [];
  });
  const stop_ids = _.uniq(_.flatten(routeStopIds));
  return stop_ids;
}

function getRoutesWithStops(dir) {
  const stopPropsToPick = ["stop_id", "stop_name", "stop_lat", "stop_lon"];
  const stops = getCollection(`${dir}/stops.json`);
  const routesWithTripIds = getRoutesWithTripIds(dir);
  const tripsWithStopIds = getTripsWithStopIds(dir);
  const routesWithStops = routesWithTripIds.map((route) => {
    const stop_ids = getStopIds(route, tripsWithStopIds);
    const routeStops = stops
      .filter((stop) => stop_ids.includes(stop.stop_id))
      .map((stop) => _.pick(stop, stopPropsToPick));
    return {
      route_id: route.route_id,
      stops: routeStops,
    };
  });
  return routesWithStops;
}

function addRoutesWithStops(dir) {
  console.log(`Adding routesWithStops to ${dir}`);
  const routesWithStops = getRoutesWithStops(dir);
  writeJson(`${dir}/routesWithStops.json`, routesWithStops);
}

// const DIR = "data/parsed/septaGtfs";
// addRoutesWithStopsFile(DIR);

module.exports = {
  addRoutesWithStops,
};
