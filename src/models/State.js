import { Landmarks } from "../components/Landmark";
import { addLayers } from "../Map/map";
import IdColumn from "./IdColumn";
import { assignUnitsAsTheyLoad } from "./lib";
import { generateId } from "../utils";
import { getColumnSets, getParts } from "./column-sets";

// We should break this up. Maybe like this:
// MapState (map, layers)
// DistrictData (column sets) ?
// DistrictingPlan (assignment, problem, export()) ?
// Units (unitsRecord, reference to layer?) ?
// "place" is mostly split up into these categories now.

/**
 * Holds all of the state that needs to be updated after
 * each brush stroke. (Mainly the Plan assignment and the
 * population tally.)
 */
export default class State {
    constructor(map, { place, problem, id, assignment, units }) {
        if (id) {
            this.id = id;
        } else {
            this.id = generateId(8);
        }
        this.placeId = place.id;

        this.initializeMapState(map, place, units);
        this.getInitialState(place, assignment, problem, units);
        this.subscribers = [];

        this.update = this.update.bind(this);
        this.exportAsJSON = this.exportAsJSON.bind(this);
        this.render = this.render.bind(this);
    }
    initializeMapState(map, place, unitsRecord) {
        const { units, unitsBorders, points } = addLayers(
            map,
            unitsRecord.tilesets
        );

        this.units = units;
        this.unitsBorders = unitsBorders;
        this.layers = [units, points];
        this.map = map;

        if (place.landmarks) {
            this.landmarks = new Landmarks(map, place.landmarks);
        }
    }
    update(feature, part) {
        this.columnSets.forEach(columnSet => columnSet.update(feature, part));
        this.assignment[this.idColumn.getValue(feature)] = part;
    }
    getInitialState(place, assignment, problem, unitsRecord) {
        this.place = place;
        this.unitsRecord = unitsRecord;

        this.idColumn = new IdColumn(unitsRecord.idColumn);
        if (unitsRecord.hasOwnProperty("nameColumn")) {
            this.nameColumn = new IdColumn(unitsRecord.nameColumn);
        }

        this.problem = problem;
        this.parts = getParts(problem);
        this.columnSets = getColumnSets(this, unitsRecord);
        this.assignment = {};

        if (assignment) {
            assignUnitsAsTheyLoad(this, assignment);
            // Hide landmarks if we are loading an existing plan
            this.landmarks.handleToggle(false);
        }
    }
    exportAsJSON() {
        const serialized = {
            assignment: this.assignment,
            id: this.id,
            idColumn: { key: this.idColumn.key, name: this.idColumn.name },
            placeId: this.placeId,
            problem: this.problem,
            units: this.unitsRecord
        };
        const text = JSON.stringify(serialized);
        download(`districtr-plan-${this.id}.json`, text);
    }
    subscribe(f) {
        this.subscribers.push(f);
        this.render();
    }
    render() {
        for (let f of this.subscribers) {
            f();
        }
    }
    hasExpectedData(feature) {
        if (feature === undefined || feature.properties === undefined) {
            return false;
        }
        for (let column of this.columns) {
            if (feature.properties[column.key] === undefined) {
                return false;
            }
        }
        return true;
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
