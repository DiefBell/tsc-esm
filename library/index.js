import { spawnSync } from "child_process"
import { existsSync, readFileSync } from "fs"
import glob from "fast-glob"
import patchJsImports from "@digitak/grubber/library/utilities/patchJsImports"
import path from "path"
import relaxedJson from "relaxed-json"

const { parse } = relaxedJson

const globDirectory = input => glob.sync(input, { onlyDirectories: true })

export function build(aliases) {
	try {
		compile()
		patch(aliases)
	} catch (error) {
		console.error("[tsc-esm] Could not build:", error)
	}
}

export function compile() {
	const tscProcess = rocess.platform === "win32"
		? spawnSync("node_modules\\.bin\\tsc", process.argv.slice(2), { stdio: 'inherit', shell: true })
		: spawnSync("node_modules/.bin/tsc", process.argv.slice(2), { stdio: 'inherit', shell: false });
	
	if(tscProcess.error) throw tscProcess.error;
}

export function patch(aliases) {
	const tsconfig = getConfigFile(process.argv.slice(2))
	const directories = getOutputDirectories(tsconfig)
	patchJsImports(directories, aliases)
}

/**
 * @return the output directories of typescript compiler
 */
function getOutputDirectories(tsconfig) {
	if (existsSync(tsconfig)) {
		try {
			const { compilerOptions, extends: parentConfigFile } = parse(readFileSync(tsconfig, "utf8"))
			if (compilerOptions.outDir) return globDirectory(compilerOptions.outDir)
			if (compilerOptions.outFile) return globDirectory(path.join(compilerOptions.outFile, '..'))
			if (parentConfigFile) return getOutputDirectories(path.resolve(tsconfig, parentConfigFile))
		} catch (error) {
			throw new SyntaxError(`Could not parse tsconfig.json file at ${tsconfig}. ${error}`)
		}
	}
	return ["."]
}

function getConfigFile(argv) {
	const projectIndex = Math.max(argv.indexOf('-p'), argv.indexOf('--project'))
	const projectOrTsConfig = argv[projectIndex + 1]
	if (!projectOrTsConfig) {
		return 'tsconfig.json'
	}
	if (projectOrTsConfig.endsWith('.json')) {
		return projectOrTsConfig
	}
	return path.join(projectOrTsConfig, 'tsconfig.json')
}
