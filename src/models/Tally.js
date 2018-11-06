export default class Tally {
    constructor(dataAccessor, initialData) {
        this.data = initialData;
        this.accessor = dataAccessor;
        this.update = this.update.bind(this);
    }
    update(feature, color) {
        if (color !== undefined && color !== null) {
            this.data[color] += this.accessor(feature);
        }
        if (feature.state.color !== undefined && feature.state.color !== null) {
            this.data[feature.state.color] -= this.accessor(feature);
        }
    }
}
