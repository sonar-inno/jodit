export function replaceImagesSourceWithBase64(html, rtfData) {
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

function findAllImageElementsWithLocalSource(html) {
	// Declare variables
	var p = 0;
	var pos = 0;
	var i = -1;
	const imgs = [];

	// Search the string and counts the number of e's
	while (p != -1) {
		p = html.indexOf("![endif]", i + 1);
		if (p != -1) {
			pos = html.indexOf("file://", p + 1);
			i = pos;

			if (pos != -1) {
				imgs.push(pos);
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