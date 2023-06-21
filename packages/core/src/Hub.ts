// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConsoleLogger as Logger } from './Logger';

const logger = new Logger('Hub');

const AMPLIFY_SYMBOL = (
	typeof Symbol !== 'undefined' && typeof Symbol.for === 'function'
		? Symbol.for('amplify_default')
		: '@@amplify_default'
) as Symbol;

export type LegacyCallback<
	Channel extends string | RegExp,
	EventData extends AmplifyEventDataMap = AmplifyEventDataMap
> = { onHubCapsule: HubCallback<Channel, EventData> };

function isLegacyCallback<
	Channel extends string | RegExp,
	EventData extends AmplifyEventDataMap = AmplifyEventDataMap
>(callback: any): callback is LegacyCallback<Channel, EventData> {
	return (
		(<LegacyCallback<Channel, EventData>>callback).onHubCapsule !== undefined
	);
}

export type AuthSignInResult = {};
export type AuthSignUpResult = {};
export type AuthError = {};

export type AmplifyChannel =
	| 'auth'
	| 'storage'
	| 'core'
	| 'api'
	| 'analytics'
	| 'interactions'
	| 'pubsub'
	| 'datastore';

export type NotificationsHubEventData = { event: 'record'; data: any };
export type AmplifyEventDataMap = { event: string; data?: unknown };

export type AuthHubEventData =
	| { event: 'signIn'; data: AuthSignInResult }
	| { event: 'signUp'; data: AuthSignUpResult }
	| { event: 'signUpFailure'; data: AuthError }
	| { event: 'signIn_failure'; data: AuthError }
	| { event: 'confirmSignUp'; data: any }
	| { event: 'signOut'; data: any }
	| { event: 'cognitoHostedUI'; data: any }
	| { event: 'tokenRefresh_failure'; data: Error | undefined }
	| { event: 'completeNewPassword_failure'; data: Error }
	| { event: 'userDeleted'; data: string }
	| { event: 'updateUserAttributes_failure'; data: Error }
	| { event: 'updateUserAttributes'; data: Record<string, string> }
	| { event: 'forgotPassword_failure'; data: Error }
	| { event: 'verify'; data: any }
	| { event: 'tokenRefresh'; data: undefined }
	| { event: 'configured'; data: null }
	| { event: 'autoSignIn'; data: any }
	| { event: 'forgotPassword'; data: any }
	| {
			event: 'parsingCallbackUrl';
			data: {
				url: string | undefined;
			};
	  }
	| { event: 'customOAuthState'; data: string }
	| { event: 'cognitoHostedUI_failure'; data: Error }
	| { event: 'customState_failure'; data: Error }
	| { event: 'forgotPasswordSubmit'; data: any }
	| { event: 'forgotPasswordSubmit_failure'; data: Error }
	| { event: 'autoSignIn_failure'; data: null };

export type HubCapsule<
	Channel extends string | RegExp,
	EventDataMap extends AmplifyEventDataMap = AmplifyEventDataMap
> = {
	channel: Channel;
	payload: HubPayload<EventDataMap>;
	source: string;
	patternInfo?: string[];
};

export type HubCallback<
	Channel extends string | RegExp,
	EventData extends AmplifyEventDataMap = AmplifyEventDataMap
> = (capsule: HubCapsule<Channel, EventData>) => void;

export type HubPayload<
	EventDataMap extends AmplifyEventDataMap = AmplifyEventDataMap
> = EventDataMap & {
	message?: string;
};

export type AmplifyHubCallbackMap<Channel extends AmplifyChannel> = {
	auth: HubCallback<Channel, AuthHubEventData>;
	storage: HubCallback<Channel>;
	core: HubCallback<Channel>;
	analytics: HubCallback<Channel>;
	api: HubCallback<Channel>;
	interactions: HubCallback<Channel>;
	pubsub: HubCallback<Channel>;
	datastore: HubCallback<Channel>;
	notifications: HubCallback<Channel, NotificationsHubEventData>;
};

export type GetHubCallBack<
	Channel extends string | RegExp,
	EventDataMap extends AmplifyEventDataMap = AmplifyEventDataMap
> = Channel extends AmplifyChannel
	? AmplifyHubCallbackMap<Channel>[Channel]
	: HubCallback<Channel, EventDataMap>;

export type AnyChannel = string & {};

// export type PayloadFromCallback<T> = T extends (
// 	arg?: infer A extends Record<string, any>
// ) => any
// 	? A['payload']
// 	: never;

export type AmplifyChannelMap<
	Channel extends AmplifyChannel | AnyChannel = AmplifyChannel | AnyChannel,
	EventDataMap extends AmplifyEventDataMap = AmplifyEventDataMap
> = {
	channel: Channel | RegExp;
	eventData: EventDataMap;
};

interface IListener<
	Channel extends string | RegExp = string | RegExp,
	EventData extends AmplifyEventDataMap = AmplifyEventDataMap
> {
	name: string;
	callback: HubCallback<Channel, EventData>;
}
interface IPattern<
	Channel extends string | RegExp,
	EventData extends AmplifyEventDataMap = AmplifyEventDataMap
> {
	pattern: RegExp;
	callback: HubCallback<Channel, EventData>;
}

// Hub
// declare class HubClass {
//   listen<
//     ChannelMap extends AmplifyChannelMap,
//     Channel extends ChannelMap["channel"] = ChannelMap["channel"]
//   >(
//     channel: Channel,
//     callback: GetHubCallBack<Channel, ChannelMap["eventData"]>,
//     listenerName?: string
//   ): void;

//   dispatch<
//     ChannelMap extends AmplifyChannelMap,
//     Channel extends ChannelMap["channel"] = ChannelMap["channel"]
//   >(
//     channel: Channel,
//     payload: PayloadFromCallback<
//       GetHubCallBack<Channel, ChannelMap["eventData"]>
//     >,
//     source?: string,
//     ampSymbol?: Symbol
//   ): void;
// }
export class HubClass {
	name: string;
	private listeners: IListener[] = [];
	private patterns: IPattern<any>[] = [];

	protectedChannels = [
		'core',
		'auth',
		'api',
		'analytics',
		'interactions',
		'pubsub',
		'storage',
		'ui',
		'xr',
	];

	constructor(name: string) {
		this.name = name;
	}

	/**
	 * Used internally to remove a Hub listener.
	 *
	 * @remarks
	 * This private method is for internal use only. Instead of calling Hub.remove, call the result of Hub.listen.
	 */
	private _remove<
		Channel extends string | RegExp,
		EventData extends AmplifyEventDataMap = AmplifyEventDataMap
	>(channel: Channel, listener: HubCallback<string | RegExp, EventData>) {
		{
			if (channel instanceof RegExp) {
				const pattern = this.patterns.find(
					({ pattern }) => pattern.source === channel.source
				);
				if (!pattern) {
					logger.warn(`No listeners for ${channel}`);
					return;
				}
				this.patterns = [...this.patterns.filter(x => x !== pattern)];
			} else {
				const holder = this.listeners[channel as string];
				if (!holder) {
					logger.warn(`No listeners for ${channel}`);
					return;
				}
				this.listeners[channel as string] = [
					...holder.filter(({ callback }) => callback !== listener),
				];
			}
		}
	}

	/**
	 * @deprecated Instead of calling Hub.remove, call the result of Hub.listen.
	 */
	remove<
		Channel extends string | RegExp,
		EventData extends AmplifyEventDataMap = AmplifyEventDataMap
	>(channel: Channel, listener: HubCallback<string | RegExp, EventData>) {
		this._remove(channel, listener);
	}

	/**
	 * Used to send a Hub event.
	 *
	 * @param channel - The channel on which the event will be broadcast
	 * @param payload - The HubPayload
	 * @param source  - The source of the event; defaults to ''
	 * @param ampSymbol - Symbol used to determine if the event is dispatched internally on a protected channel
	 *
	 */
	dispatch<
		EventData extends AmplifyEventDataMap,
		ChannelMap extends AmplifyChannelMap,
		Channel extends ChannelMap['channel'] = ChannelMap['channel']
	>(
		channel: Channel,
		payload: HubPayload<EventData>,
		source?: string,
		ampSymbol?: Symbol
	): void {
		if (this.protectedChannels.indexOf(channel as string) > -1) {
			const hasAccess = ampSymbol === AMPLIFY_SYMBOL;

			if (!hasAccess) {
				logger.warn(
					`WARNING: ${channel} is protected and dispatching on it can have unintended consequences`
				);
			}
		}

		const capsule: HubCapsule<Channel, EventData> = {
			channel,
			payload: { ...payload },
			source,
			patternInfo: [],
		};

		try {
			this._toListeners(capsule);
		} catch (e) {
			logger.error(e);
		}
	}

	/**
	 * Used to listen for Hub events.
	 *
	 * @param channel - The channel on which to listen
	 * @param callback - The callback to execute when an event is received on the specified channel
	 * @param listenerName - The name of the listener; defaults to 'noname'
	 * @returns A function which can be called to cancel the listener.
	 *
	 */
	listen<
		ChannelMap extends AmplifyChannelMap,
		Channel extends ChannelMap['channel'] = ChannelMap['channel']
	>(
		channel: Channel,
		callback: GetHubCallBack<Channel, ChannelMap['eventData']>,
		listenerName?: string
	): () => void {
		let cb: GetHubCallBack<Channel, ChannelMap['eventData']>;
		// Check for legacy onHubCapsule callback for backwards compatability
		if (isLegacyCallback(callback)) {
			logger.warn(
				`WARNING onHubCapsule is Deprecated. Please pass in a callback.`
			);
			cb = callback.onHubCapsule.bind(callback);
		} else if (typeof callback !== 'function') {
			throw new Error('No callback supplied to Hub');
		} else {
			cb = callback;
		}

		if (channel instanceof RegExp) {
			this.patterns.push({
				pattern: channel,
				callback: cb,
			});
		} else {
			let holder = this.listeners[channel as string];

			if (!holder) {
				holder = [];
				this.listeners[channel as string] = holder;
			}

			holder.push({
				name: listenerName,
				callback: cb,
			});
		}

		return () => {
			this._remove(channel, cb);
		};
	}

	private _toListeners<
		Channel extends string | RegExp,
		EventDataMap extends AmplifyEventDataMap
	>(capsule: HubCapsule<Channel, EventDataMap>) {
		const { channel, payload } = capsule;
		const holder = this.listeners[channel as string];

		if (holder) {
			holder.forEach(listener => {
				logger.debug(`Dispatching to ${channel} with `, payload);
				try {
					listener.callback(capsule);
				} catch (e) {
					logger.error(e);
				}
			});
		}

		if (this.patterns.length > 0) {
			if (!payload.message) {
				logger.warn(`Cannot perform pattern matching without a message key`);
				return;
			}

			const payloadStr = payload.message;

			this.patterns.forEach(pattern => {
				const match = payloadStr.match(pattern.pattern);
				if (match) {
					const [, ...groups] = match;
					const dispatchingCapsule: HubCapsule<Channel, EventDataMap> = {
						...capsule,
						patternInfo: groups,
					};
					try {
						pattern.callback(dispatchingCapsule);
					} catch (e) {
						logger.error(e);
					}
				}
			});
		}
	}
}

/*We export a __default__ instance of HubClass to use it as a 
pseudo Singleton for the main messaging bus, however you can still create
your own instance of HubClass() for a separate "private bus" of events.*/
export const Hub = new HubClass('__default__');
