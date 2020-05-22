const promisify = require('util').promisify;
const { readFile: fsReadFile, writeFile: fsWriteFile, unlink: fsUnlink } = require('fs');
const [readFile, writeFile, unlinkFile] = [promisify(fsReadFile), promisify(fsWriteFile), promisify(fsUnlink)];
const resolve = require('path').resolve;
const Pipeline = require('gltf-pipeline');
const GLTF = require('./gltf');

async function processMenuGlb() {
	const glb = await readFile(resolve(__dirname, '../public/menu.glb'));
	const result = await Pipeline.glbToGltf(glb);
	console.log(result);
	Pipeline.gltfToGlb()
}

/*async function convertToDataUrl(filename: string): Promise<string> {
	const data = await readFile(filename);
	return 'data:application/octet-stream;base64,' + data.toString('base64');
}

async function postprocessTable(filename: string) {
	// read JSON
	const gltfFile = path.resolve(process.cwd(), filename);
	const strData = await readFile(gltfFile, { encoding: 'utf8' });
	const gltf = JSON.parse(strData) as GLTF.GlTf;

	// rewrite image references
	const imgReference = gltf.images[0];
	gltf.images = [
		{
			...imgReference,
			name: 'BoardSmall',
			uri: path.relative(
				path.dirname(gltfFile),
				path.resolve(__dirname, '../../public/img/caesar/board-small.jpg'))
				.replace(/\\/g, '/')
		}, {
			...imgReference,
			name: 'BoardMedium',
			uri: path.relative(
				path.dirname(gltfFile),
				path.resolve(__dirname, '../../public/img/caesar/board-medium.jpg'))
				.replace(/\\/g, '/')
		}, {
			...imgReference,
			name: 'BoardLarge',
			uri: path.relative(
				path.dirname(gltfFile),
				path.resolve(__dirname, '../../public/img/caesar/board-large.jpg'))
				.replace(/\\/g, '/')
		}
	];

	// rewrite texture references
	gltf.textures = gltf.images.map((img, i) => ({ name: img.name, source: i } as GLTF.Texture));

	// pack binary data
	const binFile = path.resolve(path.dirname(gltfFile), gltf.buffers[0].uri)
	gltf.buffers[0].uri = await convertToDataUrl(binFile);
	await unlinkFile(binFile);

	// output result
	await writeFile(gltfFile, JSON.stringify(gltf));
}*/

processMenuGlb().catch(ex => {
	console.error(ex);
	process.exit(1);
});
