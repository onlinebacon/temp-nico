const toRad = (deg) => deg*(Math.PI/180);
const toDeg = (rad) => rad*(180/Math.PI);
const round = (val) => val.toFixed(1)*1;

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

window.start = 0;
window.end = 24;
window.width = 800;
window.height = 600;
window.rotPerFrame = 15;
window.mode = 'globeUp';
window.cumulative = 'true';
window.hideNegativeAlt = 'false';
window.visibleRad = 200;
window.backgroundColor = '#333333';
window.earthLineColor = '#0077ff';
window.prevSightColor = '#ffffff';
window.currSightColor = '#ffffff';
window.nLongs = 32;
window.nLats = 32;
window.lineWidth = 1;
window.prevOpacity = 0.2;

const hexToRgba = (hex, opacity) => `rgba(${
	[ ...hex.replace(/^#/, '').match(/\w\w/g) ]
	.map(val => parseInt(val, 16))
	.concat(opacity)
	.join(', ')
})`;

canvas.width = width;
canvas.height = height;

const px = (val) => val/visibleRad;

const sightSize = 2;

const mulVec3Mat3 = (vec, mat) => {
    const [ x, y, z ] = vec;
    const [ ix, iy, iz, jx, jy, jz, kx, ky, kz ] = mat;
    return [
        x*ix + y*jx + z*kx,
        x*iy + y*jy + z*ky,
        x*iz + y*jz + z*kz,
    ];
};

const rotationXMat3 = (angle) => [
    1, 0, 0,
    0, Math.cos(angle), -Math.sin(angle),
    0, Math.sin(angle), Math.cos(angle),
];

const rotationYMat3 = (angle) => [
    Math.cos(angle), 0, Math.sin(angle),
    0, 1, 0,
    -Math.sin(angle), 0, Math.cos(angle),
];

const rotationZMat3 = (angle) => {
	const mat = [
		Math.cos(angle), -Math.sin(angle), 0,
		Math.sin(angle), Math.cos(angle), 0,
		0, 0, 1,
	];
	return mat;
};

const rotateXVec3 = (vec, angle) => mulVec3Mat3(vec, rotationXMat3(angle));
const rotateYVec3 = (vec, angle) => mulVec3Mat3(vec, rotationYMat3(angle));
const rotateZVec3 = (vec, angle) => mulVec3Mat3(vec, rotationZMat3(angle));

const setNormalTransform = () => {
    ctx.setTransform(
        visibleRad, 0,
        0, -visibleRad,
        width*0.5, height*0.5,
    );
};

const clear = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
};

const createGlobeLineOfSight = ([ lat, lon, azm, alt ], rot) => {
	let a = [ 0, 0, 0 ];
	let b = [ 0, sightSize, 0 ];
	b = rotateXVec3(b, -alt);
	b = rotateZVec3(b, azm);
	a[2] += 1;
	b[2] += 1;
	a = rotateYVec3(rotateXVec3(a, lat), - lon - rot);
	b = rotateYVec3(rotateXVec3(b, lat), - lon - rot);
	return [ a, b ];
};

const createFELineOfSight = ([ lat, lon, azm, alt ], rot) => {
	let a = [ 0, 0, 0 ];
	let b = [ 0, sightSize, 0 ];
	b = rotateXVec3(b, -alt);
	b = rotateZVec3(b, azm);
	const dy = lat/(Math.PI) - 0.5;
	a[1] += dy;
	b[1] += dy;
	a = rotateZVec3(a, - lon - rot);
	b = rotateZVec3(b, - lon - rot);
	return [ a, b ];
};

const renderSight = {
	globeUp: (row, rot, color) => {
		let [ a, b ] = createGlobeLineOfSight(row, rot);
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(a[0], -a[2]);
		ctx.lineTo(b[0], -b[2]);
		ctx.stroke();
	},
	globeSide: (row, rot, color) => {
		let [ a, b ] = createGlobeLineOfSight(row, rot);
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0], b[1]);
		ctx.stroke();
	},
	aeUp: (row, rot, color) => {
		const [ a, b ] = createFELineOfSight(row, rot);
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0], b[1]);
		ctx.stroke();
	},
	aeSide: (row, rot, color) => {
		let [ a, b ] = createFELineOfSight(row, rot);
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(a[0], a[2]);
		ctx.lineTo(b[0], b[2]);
		ctx.stroke();
	},
};

const renderEarth = {
	globeUp: (rot) => {
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = earthLineColor;
		ctx.beginPath();
		for (let i=0; i<nLongs; ++i) {
			const angle = i/nLongs*Math.PI*2 + rot;
			const sin = Math.sin(angle);
			const cos = Math.cos(angle);
			ctx.moveTo(0, 0);
			ctx.lineTo(sin, -cos);
		}
		ctx.stroke();
		const n = nLats >> 1;
		for (let i=0; i<n; ++i) {
			ctx.beginPath();
			const angle = i/n*Math.PI/2;
			const cos = Math.cos(angle);
			ctx.arc(0, 0, cos, 0, Math.PI*2);
			ctx.stroke();
		}
	},
	globeSide: (rot) => {
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = earthLineColor;
		ctx.beginPath();
		ctx.arc(0, 0, 1, 0, Math.PI*2);
		const makeLongLine = (angle) => {
			angle = (angle + Math.PI)%(Math.PI*2) - Math.PI;
			if (Math.abs(angle) >= Math.PI/2) {
				return;
			}
			const sin = Math.sin(angle);
			const n = 90;
			ctx.moveTo(0, -1);
			for (let i=1; i<n; ++i) {
				const lat = (i/n - 0.5)*Math.PI;
				let x = sin*Math.cos(lat);
				let y = Math.sin(lat);
				ctx.lineTo(x, y);
			}
		};
		for (let i=1; i<nLats; ++i) {
			const angle = Math.PI*(i/nLats - 0.5);
			const y = Math.sin(angle);
			const dx = Math.cos(angle);
			ctx.moveTo(-dx, y);
			ctx.lineTo(dx, y);
		}
		for (let i=0; i<nLongs; ++i) {
			const lon = Math.PI*2*(i/nLongs - 0.5);
			makeLongLine(lon + rot);
		}
		ctx.stroke();
	},
	aeUp: (rot) => {
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = earthLineColor;
		ctx.beginPath();
		ctx.arc(0, 0, 1, 0, Math.PI*2);
		for (let i=0; i<nLongs; ++i) {
			const angle = i/nLongs*Math.PI*2 + rot;
			const x = Math.sin(angle);
			const y = -Math.cos(angle);
			ctx.moveTo(0, 0);
			ctx.lineTo(x, y);
		}
		ctx.stroke();
		for (let i=1; i<nLats; ++i) {
			const rad = i/nLats;
			ctx.beginPath();
			ctx.arc(0, 0, rad, 0, Math.PI*2);
			ctx.stroke();
		}
	},
	aeSide: (rot) => {
		ctx.lineWidth = px(lineWidth);
		ctx.strokeStyle = earthLineColor;
		ctx.beginPath();
		ctx.moveTo(-1, 0);
		ctx.lineTo(1, 0);
		ctx.stroke();
	},
};

const drawLegend = ({ lat, lon, azm, alt }, rot) => {
	rot = toDeg(rot);
	[ rot, lat, lon, azm, alt ] = [ rot, lat, lon, azm, alt ].map(round);
	const text = `rot=${rot}, lat=${lat}, lon=${lon}, azm=${azm}, alt=${alt}`;
	ctx.fillStyle = '#aaa';
	ctx.textBaseline = 'top';
	ctx.textAlign = 'left';
	ctx.font = '16px arial';
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillText(text, 10, 10);
};

const renderFrame = (i) => {
	if (i < 0 || i >= rows.length) {
		return;
	}
	if (width != canvas.width) {
		canvas.width = width;
	}
	if (height != canvas.height) {
		canvas.height = height;
	}
	let rot = i*toRad(rotPerFrame);
	clear();
	setNormalTransform();
	renderEarth[mode](rot);
	let st = Number(start);
	if (cumulative == 'true') {
		for (let j=st; j<i; ++j) {
			let rot = j*toRad(rotPerFrame);
			const alt = rows[j][3];
			if (alt < 0 && (hideNegativeAlt == 'true')) continue;
			const color = hexToRgba(prevSightColor, prevOpacity);
			renderSight[mode](rows[j], rot, color);
		}
	}
	if (rows[i][3] >= 0 || hideNegativeAlt == 'false') {
		renderSight[mode](rows[i], rot, currSightColor);
	}
};
