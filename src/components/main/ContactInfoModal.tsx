import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useCallback, useEffect, useRef, useState,
} from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiCountryCode, ApiUser, ApiUserStatus } from '../../api/types';

import { getUserStatus } from '../../global/helpers';
import { selectUser, selectUserStatus } from '../../global/selectors';
import { formatPhoneNumberWithCode } from '../../util/phoneNumber';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import renderText from '../common/helpers/renderText';

import useCurrentOrPrev from '../../hooks/useCurrentOrPrev';
import useFlag from '../../hooks/useFlag';
import useOldLang from '../../hooks/useOldLang';

import Avatar from '../common/Avatar';
import ChatExtra from '../common/profile/ChatExtra';
import ProfileInfo from '../common/ProfileInfo';
import Checkbox from '../ui/Checkbox';
import InputText from '../ui/InputText';
import ListItem from '../ui/ListItem';
import Modal from '../ui/Modal';
import SearchInput from '../ui/SearchInput';

import './ContactInfoModal.scss';

const ANIMATION_DURATION = 200;

export type OwnProps = {
  isOpen: boolean;
  userId?: string;
  isByPhoneNumber?: boolean;
};

type StateProps = {
  user?: ApiUser;
  userStatus?: ApiUserStatus;
  phoneCodeList: ApiCountryCode[];
};

const ContactInfoModal: FC<OwnProps & StateProps> = ({
  isOpen,
  userId,
  isByPhoneNumber,
  user,
  userStatus,
  phoneCodeList,
}) => {
  const { updateContact, importContact, closeNewContactDialog } = getActions();

  const lang = useOldLang();
  const renderingUser = useCurrentOrPrev(user);
  const renderingIsByPhoneNumber = useCurrentOrPrev(isByPhoneNumber);
  // eslint-disable-next-line no-null/no-null
  const inputRef = useRef<HTMLInputElement>(null);

  const [isShown, markIsShown, unmarkIsShown] = useFlag();
  const [firstName, setFirstName] = useState<string>(renderingUser?.firstName ?? '');
  const [lastName, setLastName] = useState<string>(renderingUser?.lastName ?? '');
  const [phone, setPhone] = useState<string>(renderingUser?.phoneNumber ?? '');
  const [shouldSharePhoneNumber, setShouldSharePhoneNumber] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      markIsShown();
      setFirstName(renderingUser?.firstName ?? '');
      setLastName(renderingUser?.lastName ?? '');
      setPhone(renderingUser?.phoneNumber ?? '');
      setShouldSharePhoneNumber(true);
    }
  }, [isOpen, markIsShown, renderingUser?.firstName, renderingUser?.lastName, renderingUser?.phoneNumber]);

  useEffect(() => {
    if (!IS_TOUCH_ENV && isShown) {
      setTimeout(() => { inputRef.current?.focus(); }, ANIMATION_DURATION);
    }
  }, [isShown]);

  const handleClose = useCallback(() => {
    closeNewContactDialog();
    setFirstName('');
    setLastName('');
    setPhone('');
  }, [closeNewContactDialog]);

  if (!isOpen && !isShown) {
    return undefined;
  }

  const profileId = '5018592946';

  return (
    <Modal
      className="ContactInfoModal"
      isOpen={isOpen}
      onClose={handleClose}
      onCloseAnimationEnd={unmarkIsShown}
      hasCloseButton
    >
      {/* {renderingUser && renderAddContact()} */}
      {/* {renderingIsByPhoneNumber && renderCreateContact()} */}
      <div className="profile-info">

        <ProfileInfo peerId={profileId} canPlayVideo={false} />

        <div className="flex-row">
          <ListItem
            narrow
            ripple
          >
            <i className="icon icon-message-filled" />
            <span>
              消息
            </span>
          </ListItem>
          <ListItem
            narrow
            ripple
          >
            <i className="icon icon-phone-filled" />
            <span>
              语音
            </span>
          </ListItem>
          <ListItem
            narrow
            ripple
          >
            <i className="icon icon-user-lock" />
            <span>
              私密聊天
            </span>
          </ListItem>
        </div>
        <ChatExtra chatOrUserId={profileId} isSavedDialog={false} />
      </div>
    </Modal>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { userId }): StateProps => {
    const user = userId ? selectUser(global, userId) : undefined;
    return {
      user,
      userStatus: userId ? selectUserStatus(global, userId) : undefined,
      phoneCodeList: global.countryList.phoneCodes,
    };
  },
)(ContactInfoModal));
