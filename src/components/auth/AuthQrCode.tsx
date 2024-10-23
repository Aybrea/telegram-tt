import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useLayoutEffect, useRef,
  useState,
} from '../../lib/teact/teact';
import { getGlobal, setGlobal } from '../../lib/teact/teactn';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';
import type { LangCode } from '../../types';

import { DEFAULT_LANG_CODE, STRICTERDOM_ENABLED } from '../../config';
import { disableStrict, enableStrict } from '../../lib/fasterdom/stricterdom';
import { WebSocketClient } from '../../lib/guisejs/websocketClient';
import { updateTabState } from '../../global/reducers/tabs';
import buildClassName from '../../util/buildClassName';
import { getCurrentTabId } from '../../util/establishMultitabRole';
import { oldSetLanguage } from '../../util/oldLangProvider';
import apiClient from '../../api/axios/axiosConfig';
import { buildAuthStateUpdate, onAuthReady } from '../../api/gramjs/methods/auth';

// import { LOCAL_TGS_URLS } from '../common/helpers/animatedAssets';
// import renderText from '../common/helpers/renderText';
// import { getSuggestedLanguage } from './helpers/getSuggestedLanguage';
import useAsync from '../../hooks/useAsync';
import useFlag from '../../hooks/useFlag';
import useMediaTransitionDeprecated from '../../hooks/useMediaTransitionDeprecated';
import useOldLang from '../../hooks/useOldLang';

// import useOldLangString from '../../hooks/useOldLangString';
// import AnimatedIcon from '../common/AnimatedIcon';
import Button from '../ui/Button';
import Loading from '../ui/Loading';

// import blankUrl from '../../assets/blank.png';
import nlogoIconPath from '../../assets/nIcons/nLogo.svg';

type StateProps =
  Pick<GlobalState, 'connectionState' | 'authState' | 'authQrCode'>
  & { language?: LangCode };

const DATA_PREFIX = 'tg://login?token=';
const QR_SIZE = 280;
// const QR_PLANE_SIZE = 54;
const QR_CODE_MUTATION_DURATION = 50; // The library is asynchronous and we need to wait for its mutation code

let qrCodeStylingPromise: Promise<typeof import('qr-code-styling')>;

function ensureQrCodeStyling() {
  if (!qrCodeStylingPromise) {
    qrCodeStylingPromise = import('qr-code-styling');
  }
  return qrCodeStylingPromise;
}

const AuthCode: FC<StateProps> = ({
  connectionState,
  authState,
  authQrCode,
  // language,
}) => {
  const {
    returnToAuthPhoneNumber,
    // setSettingOption,
  } = getActions();

  // const suggestedLanguage = getSuggestedLanguage();
  const lang = useOldLang();
  // eslint-disable-next-line no-null/no-null
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const isConnected = connectionState === 'connectionStateReady';
  // const continueText = useOldLangString(isConnected ? suggestedLanguage : undefined, 'ContinueOnThisLanguage', true);
  // isLoading,
  // const [markIsLoading, unmarkIsLoading] = useFlag();
  const [isQrMounted, markQrMounted, unmarkQrMounted] = useFlag();

  const [message, setMessage] = useState<string>();

  useEffect(() => {
    // Construct the WebSocket URL with query parameters
    const params = new URLSearchParams();
    params.set('login', '123456');

    // Build the WebSocket URL
    const wsUrl = `ws://192.168.1.181:10708/ws?${params.toString()}`;

    // Create an instance of WebSocketClient
    const wsClient = new WebSocketClient({
      url: wsUrl,
      onOpen: (event) => {
      },
      onMessage: (value) => {
        value = JSON.parse(value);
        if (value.mod === 'loginId') {
          setMessage(value?.data);
        } else if (value.mod === 'success') {
          const tabId = getCurrentTabId();
          let global = getGlobal();
          global = {
            ...global,
            authState: 'authorizationStateReady',
          };
          // global = updateTabState(global, {
          //   authState: 'authorizationStateReady',
          // }, tabId);
          setGlobal(global);
          console.log('🚀 ~ useEffect ~ global:', global);

          // let global = getGlobal();
          // global = updateTabState(global, {
          //   newContact: {
          //     requirePermission: true,
          //   },
          // }, tabId);
          // setGlobal(global);
        }
      },
      onClose: (event) => {
        console.log('WebSocket connection closed:', event);
      },
      onError: (event) => {
        console.error('WebSocket error:', event);
      },
    });

    // Clean up on component unmount
    return () => {
      wsClient.close();
    };
  }, []);

  const { result: qrCode } = useAsync(async () => {
    const QrCodeStyling = (await ensureQrCodeStyling()).default;
    return new QrCodeStyling({
      width: QR_SIZE,
      height: QR_SIZE,
      image: nlogoIconPath,
      margin: 10,
      type: 'svg',
      dotsOptions: {
        type: 'rounded',
      },
      cornersSquareOptions: {
        type: 'extra-rounded',
      },
      qrOptions: {
        errorCorrectionLevel: 'M',
      },
    });
  }, []);

  const transitionClassNames = useMediaTransitionDeprecated(isQrMounted);

  useLayoutEffect(() => {
    console.log('🚀 ~ useLayoutEffect ~ authQrCode:', qrCode);
    if (!qrCode) {
      return () => {
        unmarkQrMounted();
      };
    }

    console.log('🚀 ~ useLayoutEffect ~ authQrCode:', isConnected);

    if (!isConnected) {
      return undefined;
    }

    const container = qrCodeRef.current!;
    const data = message;

    if (STRICTERDOM_ENABLED) {
      disableStrict();
    }

    qrCode.update({
      data,
    });

    console.log('🚀 ~ useLayoutEffect ~ isQrMounted:', isQrMounted);
    if (!isQrMounted) {
      qrCode.append(container);
      markQrMounted();
    }

    if (STRICTERDOM_ENABLED) {
      setTimeout(() => {
        enableStrict();
      }, QR_CODE_MUTATION_DURATION);
    }

    return undefined;
  }, [isConnected, authQrCode, isQrMounted, markQrMounted, unmarkQrMounted, qrCode]);

  useEffect(() => {
    if (isConnected) {
      void oldSetLanguage(DEFAULT_LANG_CODE);
    }
  }, [isConnected]);

  // const handleLangChange = useCallback(() => {
  //   markIsLoading();

  //   void oldSetLanguage(suggestedLanguage, () => {
  //     unmarkIsLoading();

  //     setSettingOption({ language: suggestedLanguage });
  //   });
  // }, [markIsLoading, setSettingOption, suggestedLanguage, unmarkIsLoading]);

  const habdleReturnToAuthPhoneNumber = useCallback(() => {
    returnToAuthPhoneNumber();
  }, [returnToAuthPhoneNumber]);

  const handleSimulateScan = useCallback(
    async () => {
      // 登录信息
      const res = await apiClient.post(
        '/auth/code/login',
        {
          code: message,
        },
        {
          headers: {
            Authorization: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOjIxLCJpc3MiOiJza3kiLCJjbGllbnRfdHlwZSI6MSwiZXhwIjoxNzI5NzUwNDcwLCJpYXQiOjE3Mjk2NjQwNzB9.FNmc61pEO-FQ46CmDF21jkem9nMRfoPkjr4A2FepF9w',
          },
        },
      );
    },
    [message],
  );

  const isAuthReady = authState === 'authorizationStateWaitQrCode';

  return (
    <div id="auth-qr-form" className="custom-scroll">
      <div className="auth-form qr">
        <h1>Chat App 网页版</h1>
        <div className="qr-outer">
          <div
            className={buildClassName('qr-inner', transitionClassNames)}
            key="qr-inner"
          >
            <div
              key="qr-container"
              className="qr-container"
              ref={qrCodeRef}
              style={`width: ${QR_SIZE}px; height: ${QR_SIZE}px`}
            />
          </div>
          {!isQrMounted && <div className="qr-loading"><Loading /></div>}
        </div>
        <p>{lang('Login.QR.Description')}</p>
        <Button isText onClick={handleSimulateScan}>模拟扫码</Button>
        {/* {isAuthReady && (
          <Button isText onClick={habdleReturnToAuthPhoneNumber}>{lang('Login.QR.Cancel')}</Button>
        )} */}
        {/* {suggestedLanguage && suggestedLanguage !== language && continueText && (
          <Button isText isLoading={isLoading} onClick={handleLangChange}>{continueText}</Button>
        )} */}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): StateProps => {
    const {
      connectionState, authState, authQrCode, settings: { byKey: { language } },
    } = global;

    return {
      connectionState,
      authState,
      authQrCode,
      language,
    };
  },
)(AuthCode));
