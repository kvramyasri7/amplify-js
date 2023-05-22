import { Md5 } from '@aws-sdk/md5-js';
import { toBase64 } from '@aws-sdk/util-base64-browser';

export const calculateContentMd5 = async (file: File): Promise<string> => {
	const hasher = new Md5();
	const buffer = await readFile(file);
	hasher.update(buffer);
	const digest = await hasher.digest();
	return toBase64(digest);
};

const readFile = (file: File): Promise<ArrayBuffer> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			if (reader.result) {
				resolve(reader.result as ArrayBuffer);
			} else {
				reject(new Error('Failed to read file!'));
			}
		};
		if (file !== undefined) reader.readAsArrayBuffer(file);
	});
};
