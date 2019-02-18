import { districtColors } from "../colors";
import { Landmarks } from "../components/Landmark";
import { addLayers } from "../Map/map";
import Election from "./Election";
import IdColumn from "./IdColumn";
import Part from "./Part";
import Population from "./Population";

function getParts(problem) {
    let colors = districtColors.slice(0, problem.numberOfParts);

    let name = "District";
    if (problem.name !== undefined) {
        name = problem.name;
    }

    const parts = colors.map(
        color => new Part(color.id, name, color.id + 1, color.hex)
    );
    return parts;
}

function getPopulation(place, parts) {
    return new Population(place.population, parts);
}

function getElections(place, problem, layer) {
    return place.elections.map(
        election =>
            new Election(
                `${election.year} ${election.race} Election`,
                election.voteTotals,
                problem.numberOfParts,
                layer
            )
    );
}

/**
 * Holds all of the state that needs to be updated after
 * each brush stroke. (Mainly the Plan assignment and the
 * population tally.)
 */
export default class State {
    constructor(map, { place, problem, id, assignment }) {
        if (id) {
            this.id = id;
        } else {
            this.id = generateId(8);
        }
        this.placeId = place.id;

        this.initializeMapState(map, place);
        this.getInitialState(place, assignment, problem);
        this.subscribers = [];

        this.update = this.update.bind(this);
        this.exportAsJSON = this.exportAsJSON.bind(this);
        this.render = this.render.bind(this);
    }
    initializeMapState(map, place) {
        map.fitBounds(place.bounds, {
            padding: {
                top: 50,
                right: 350,
                left: 50,
                bottom: 50
            }
        });
        const { units, unitsBorders, points } = addLayers(map, place.tilesets);

        this.units = units;
        this.unitsBorders = unitsBorders;
        this.layers = [units, points];
        this.map = map;

        if (place.landmarks) {
            this.landmarks = new Landmarks(map, place.landmarks);
        }
    }
    update(feature, part) {
        this.population.update(feature, part);
        this.elections.forEach(election => election.update(feature, part));
        this.assignment[this.idColumn.getValue(feature)] = part;
    }
    getInitialState(place, assignment, problem) {
        this.place = place;
        this.idColumn =
            place.idColumn !== undefined
                ? new IdColumn(place.idColumn)
                : // This fallback is only here for places without an IdColumn.
                  // This includes Lowell and Alaska, and possibly more places.
                  { getValue: feature => feature.id };

        this.problem = problem;
        this.parts = getParts(problem);
        this.elections = getElections(place, problem, this.units);
        this.population = getPopulation(place, this.parts);

        this.assignment = {};

        if (assignment) {
            this.units.onceLoaded(() => {
                const features = this.units.query().reduce(
                    (lookup, feature) => ({
                        ...lookup,
                        [this.idColumn.getValue(feature)]: feature
                    }),
                    {}
                );
                // Q: Should we just keep this data around all the time?
                const ids = Object.keys(assignment);
                const numberOfIds = ids.length;
                for (let i = 0; i < numberOfIds; i++) {
                    const unitId = ids[i];
                    if (
                        features[unitId] === undefined ||
                        features[unitId] === null
                    ) {
                        console.log("Undefined feature: " + unitId);
                    }
                    this.update(features[unitId], assignment[unitId]);
                    this.units.setAssignment(unitId, assignment[unitId]);
                }
            });
        }
    }
    exportAsJSON() {
        const serialized = {
            assignment: this.assignment,
            id: this.id,
            idColumn: { key: this.idColumn.key, name: this.idColumn.name },
            placeId: this.placeId,
            problem: this.problem
        };
        const text = JSON.stringify(serialized);
        download(`districtr-plan-${this.id}.json`, text);
    }
    subscribe(f) {
        this.subscribers.push(f);
    }
    render() {
        for (let f of this.subscribers) {
            f();
        }
    }
    supportsEvaluationTab() {
        return (
            this.population.subgroups.length > 0 || this.elections.length > 0
        );
    }
}

function download(filename, text) {
    let element = document.createElement("a");
    element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

// Copied from stackoverflow https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
}

function generateId(len) {
    var arr = new Uint8Array((len || 40) / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join("");
}
