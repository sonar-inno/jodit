export function replaceImagesSourceWithBase64(html, rtfData) {
	const shapesIds = findAllShapesIdsHaveImageData(html);
	const shapesIdsHaveImgTag = findAllShapesIdsHaveImgTag(html);
	html = addImgTag(html, shapesIds, shapesIdsHaveImgTag);
	const images = findAllImageElementsWithLocalSource(html);

	if (images.length) {
		html = replaceImagesFileSourceWithInlineRepresentation(html, images, extractImageDataFromRtf(rtfData));
	}

	return html;
}

function _convertHexToBase64(hexString) {
	return btoa(hexString.match(/\w{2}/g).map(char => {
		return String.fromCharCode(parseInt(char, 16));
	}).join(''));
}

function findAllShapesIdsHaveImageData(html) {
	// Declare variables
	const finder = '<v:shape id="';
	const finderImageData = '<v:imagedata';
	const endFinder = '</v:shape>';
	var p = 0;
	var i = -1;
	const shapesIds = [];

	while (p != -1) {
		p = html.indexOf(finder, i + 1);
		if (p != -1) {
			i = p;

			// var shapeElement = html.substring(i + finder.length, html.indexOf('</v:shape>', i + finder.length));
			var shapeElement = html.substring(i, html.indexOf(endFinder, i + finder.length) + endFinder.length);
			var pos = shapeElement.indexOf(finderImageData);
			if (pos != -1) {
				var id = html.substring(i + finder.length, html.indexOf('"', i + finder.length));
				var obj = { index: i, id: id, shapeElement: shapeElement };

				shapesIds.push(obj);
			}
		}
	}

	return shapesIds;
}

function findAllShapesIdsHaveImgTag(html) {
	// Declare variables
	const finder = 'v:shapes="';
	var p = 0;
	var i = -1;
	const shapesIds = [];

	while (p != -1) {
		p = html.indexOf(finder, i + 1);
		if (p != -1) {
			i = p;

			var id = html.substring(i + finder.length, html.indexOf('"', i + finder.length));
			var obj = { index: i, id: id };

			shapesIds.push(obj);
		}
	}

	return shapesIds;
}

function addImgTag(html, shapesIds, shapesIdsHaveImgTag) {
	for (var i = shapesIds.length - 1; i >= 0; i--) {
		var found = false;
		for (var j = shapesIdsHaveImgTag.length - 1; j >= 0; j--) {

			if (shapesIds[i].id == shapesIdsHaveImgTag[j].id) {
				found = true;

				break;
			}
		}

		if (found == false) {
			const finderStyle = 'style="';
			var pStyle = shapesIds[i].shapeElement.indexOf(finderStyle);
			var style = shapesIds[i].shapeElement.substring(pStyle + finderStyle.length, shapesIds[i].shapeElement.indexOf('"', pStyle + finderStyle.length));

			const finderImageDataSrc = 'src="';
			var pImageDataSrc = shapesIds[i].shapeElement.indexOf(finderImageDataSrc);
			var src = shapesIds[i].shapeElement.substring(pImageDataSrc + finderImageDataSrc.length, shapesIds[i].shapeElement.indexOf('"', pImageDataSrc + finderImageDataSrc.length));

			var imgTag = createImgTagByStyle(shapesIds[i].id, src, style);
			var sub1 = html.substring(0, html.indexOf(shapesIds[i].shapeElement) + shapesIds[i].shapeElement.length);
			var sub2 = html.substring(html.indexOf(shapesIds[i].shapeElement) + shapesIds[i].shapeElement.length);
			html = sub1 + imgTag + sub2;
		}
	}

	return html;
}

function createImgTagByStyle(id, src, style) {
	// var newStyle = style.replaceAll('position: absolute;','');
	var pWidth = style.indexOf('width:');
	var sWidth = style.substring(pWidth, style.indexOf(';', pWidth + 1) + 1);
	var pHeight = style.indexOf('height:');
	var sHeight = style.substring(pHeight, style.indexOf(';', pHeight + 1) + 1);
	var newStyle = sWidth + sHeight;
	var imgTag = '<![endif]--><img style="' + newStyle + '" src="' + src + '" v:shapes="' + id + '">';

	return imgTag;
}

function findAllImageElementsWithLocalSource(html) {
	// Declare variables
	const finderEndIf = '<img ';
	const finderFile = 'file://';
	var p = 0;
	var pos = 0;
	var i = -1;
	const imgs = [];

	// Search the string and counts the number of e's
	while (p != -1) {
		p = html.indexOf(finderEndIf, i + 1);
		if (p != -1) {
			pos = html.indexOf(finderFile, p + 1);

			if (pos != -1) {
				i = pos;

				imgs.push(pos);
			}
			else {
				i = i + finderEndIf.length;
			}
		}
	}

	return imgs;
}

function extractImageDataFromRtf(rtfData) {
	if (!rtfData) {
		return [];
	}

	const regexPictureHeader = /{\\pict[\s\S]+?\\bliptag-?\d+(\\blipupi-?\d+)?({\\\*\\blipuid\s?[\da-fA-F]+)?[\s}]*?/;
	const regexPicture = new RegExp('(?:(' + regexPictureHeader.source + '))([\\da-fA-F\\s]+)\\}', 'g');
	const images = rtfData.match(regexPicture);
	const result = [];

	if (images) {
		for (const image of images) {
			let imageType = false;

			if (image.includes('\\pngblip')) {
				imageType = 'image/png';
			} else if (image.includes('\\jpegblip')) {
				imageType = 'image/jpeg';
			}

			if (imageType) {
				result.push({
					hex: image.replace(regexPictureHeader, '').replace(/[^\da-fA-F]/g, ''),
					type: imageType
				});
			}
		}
	}

	return result;
}

function replaceImagesFileSourceWithInlineRepresentation(html, imagePosition, imagesHexSources) {
	// Assume there is an equal amount of image elements and images HEX sources so they can be matched accordingly based on existing order.
	if (imagePosition.length === imagesHexSources.length) {
		for (let i = imagePosition.length - 1; i >= 0; i--) {
			const newSrc = `data:${imagesHexSources[i].type};base64,${_convertHexToBase64(imagesHexSources[i].hex)}`;
			html = html.substring(0, imagePosition[i]) + newSrc + html.substring(html.indexOf('"', imagePosition[i] + 1));
		}
	}

	return html;
}