import { interpolateRdBu } from "d3-scale-chromatic";
import { summarize } from "../utils";
import Layer from "./Layer";

// TODO: Make this work using a generic "election" record
// TODO: Include legend
// TODO: Consult with Ruth

function colorByConcentration(election, party, colorStops) {
    return [
        "let",
        "proportion",
        election.voteShareAsMapboxExpression(party),
        ["interpolate", ["linear"], ["var", "proportion"], ...colorStops]
    ];
}

console.log(interpolateRdBu(0), interpolateRdBu(1));

function getPartisanColorStops(color, data) {
    const { max } = summarize(data);

    let stops = [0, "rgba(0,0,0,0)", 0.499, "rgba(0,0,0,0)", 0.5, "#f9f9f9"];
    if (0.5 < max) {
        stops.push(max, color);
    }

    return stops;
}

const partyColors = {
    Democratic: "#1976d2",
    Republican: "#d32f2f"
};

function getFillColorRule(layer, election, party) {
    const percentages = layer.query(f => election.voteShare(f, party));
    const colorStops = getPartisanColorStops(partyColors[party], percentages);
    return colorByConcentration(election, party, colorStops);
}

export default class PartisanOverlay extends Layer {
    constructor(unitsLayer, election, party) {
        super(
            unitsLayer.map,
            {
                id: `${party}-overlay`,
                source: unitsLayer.sourceId,
                "source-layer": unitsLayer.sourceLayer,
                type: "fill",
                paint: {
                    "fill-color": getFillColorRule(unitsLayer, election, party),
                    "fill-opacity": 0
                }
            },
            (map, layer) => map.addLayer(layer, unitsLayer.id)
        );
        this.party = party;
    }
    changeElection(election) {
        this.setPaintProperty(
            "fill-color",
            getFillColorRule(this, election, this.party)
        );
    }
}
