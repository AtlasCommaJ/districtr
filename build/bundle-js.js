import fs from "fs";
import { rollup } from "rollup";
import plugins from "./rollup-plugins";

const IE_TARGETS = "> 0.25%, not dead";
const MODERN_TARGETS = "> 0.25%, not ie < 999";

export function bundleView(view, production = true, cache) {
    return (
        rollup({
            input: `./src/views/${view}.js`,
            plugins: plugins(IE_TARGETS, !production),
            cache: !production ? cache : false
        }).then(bundle =>
            bundle.write({
                file: `./dist/${view}.ie.js`,
                format: "umd",
                name: "ieBundle",
                sourcemap: production
            })
        ),
        rollup({
            input: `./src/views/${view}.js`,
            plugins: plugins(MODERN_TARGETS, !production),
            cache: !production ? cache : false
        }).then(bundle =>
            bundle.write({
                file: `./dist/${view}.js`,
                format: "umd",
                name: "bundle",
                sourcemap: production
            })
        )
    );
}

export default function bundleViews(production = true) {
    return new Promise((resolve, reject) =>
        fs.readdir("./src/views/", (err, files) => {
            if (err) {
                reject(err);
            }
            return resolve(files.map(filename => filename.split(".")[0]));
        })
    ).then(views =>
        Promise.all(views.map(view => bundleView(view, production)))
    );
}
