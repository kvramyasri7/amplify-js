import { DownloadFileWebOutput, DownloadFileWebInput } from '../types';
import { downloadData } from './downloadData';
import { getUrl } from './getUrl';

/**
 * Downloads a file from S3 using a presigned URL and saves it locally.
 * @param input - The input parameters for the download operation.
 * @returns A promise that resolves with the key of the downloaded file or rejects with an error.
 * @throws A {@link S3Exception} when the underlying S3 service returned error.
 * @throws A {@link StorageValidationErrorCode} when API call parameters are invalid.
 */
export const downloadFile = async (
	input: DownloadFileWebInput
): Promise<DownloadFileWebOutput> => {
	try {
		const presignedUrl = await getUrl({
			key: input.key,
		});

		// Create an anchor tag document element.
		const anchorEle = document.createElement('a');

		// Create a blob URL for our blob
		anchorEle.href = presignedUrl.url.toString();

		// Set the download attribute to the desired filename
		anchorEle.download = input.localFile;

		// Attach the anchor to the body (this is required for Firefox)
		document.body.appendChild(anchorEle);

		// Start the download
		anchorEle.click();

		// Clean up after ourselves
		document.body.removeChild(anchorEle);
		URL.revokeObjectURL(anchorEle.href);

		return new Promise((resolve, reject) => resolve({ key: input.key }));
	} catch (error) {
		return new Promise((resolve, reject) => reject(error));
	}
};
