// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Amplify } from '@aws-amplify/core';

import { DownloadInput, DownloadOutput, S3Exception } from '../types';
import { resolveS3ConfigAndInput } from '../utils/resolveS3ConfigAndInput';
import { StorageValidationErrorCode } from '../../../errors/types/validation';
import { createDownloadTask } from '../utils';
import { getObject } from '../utils/client';
import { DownloadInputWithResumability } from '../types/inputs';
import { DownloadOutputWithResumability } from '../types/outputs';

/**
 * Download S3 object data to memory
 *
 * @param input - The DownloadDataInput object.
 * @returns A cancelable task exposing result promise from `result` property.
 * @throws service: {@link S3Exception} - thrown when checking for existence of the object
 * @throws validation: {@link StorageValidationErrorCode } - Validation errors
 *
 * @example
 * ```ts
 * // Download a file from s3 bucket
 * const { body, eTag } = await download({ key, data: file, options: {
 *   onProgress, // Optional progress callback.
 * } }).result;
 * ```
 * @example
 * ```ts
 * // Cancel a task
 * const downloadTask = download({ key, data: file });
 * //...
 * downloadTask.cancel();
 * try {
 * 	await downloadTask.result;
 * } catch (error) {
 * 	if(isCancelError(error)) {
 *    // Handle error thrown by task cancelation.
 * 	}
 * }
 *```
 */

type DownloadAPI = {
	(input: DownloadInput): DownloadOutput;
	/**
	 * Download a file from specified key and access level to a local file path.
	 * This method returns a Task instance instead of item information to offer
	 * pause(), resume(), and cancel() capabilities.
	 */
	(input: DownloadInputWithResumability): DownloadOutputWithResumability;
};
export const download: DownloadAPI = (
	input: DownloadInput | DownloadInputWithResumability
): DownloadOutput | DownloadOutputWithResumability => {
	const abortController = new AbortController();

	if (input.options?.resumable) {
		const downloadTask = createDownloadTask({
			job: downloadDataJob(input, abortController.signal),
			onCancel: (abortErrorOverwrite?: Error) => {
				abortController.abort(abortErrorOverwrite);
			},
		});
		return downloadTask;
	} else {
		const downloadTask = createDownloadTask({
			job: downloadDataJob(input, abortController.signal),
			onCancel: (abortErrorOverwrite?: Error) => {
				abortController.abort(abortErrorOverwrite);
			},
		});
		return downloadTask;
	}
};

const downloadDataJob =
	(
		{
			options: downloadOptions,
			key,
			locationToDownload,
		}: DownloadInputWithResumability,
		abortSignal: AbortSignal
	) =>
	async () => {
		const { bucket, keyPrefix, s3Config } = await resolveS3ConfigAndInput(
			Amplify,
			downloadOptions
		);
		// TODO[AllanZhengYP]: support excludeSubPaths option to exclude sub paths
		const finalKey = keyPrefix + key;

		const {
			Body: body,
			LastModified: lastModified,
			ContentLength: size,
			ETag: eTag,
			Metadata: metadata,
			VersionId: versionId,
			ContentType: contentType,
		} = await getObject(
			{
				...s3Config,
				abortSignal,
				onDownloadProgress: downloadOptions?.onProgress,
			},
			{
				Bucket: bucket,
				Key: finalKey,
			}
		);
		return {
			// Casting with ! as body always exists for getObject API.
			// TODO[AllanZhengYP]: remove casting when we have better typing for getObject API
			key,
			body: body!,
			lastModified,
			size,
			contentType,
			eTag,
			metadata,
			versionId,
		};
	};
