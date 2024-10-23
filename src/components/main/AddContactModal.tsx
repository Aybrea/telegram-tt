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
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import InputText from '../ui/InputText';
import ListItem from '../ui/ListItem';
import Modal from '../ui/Modal';
import SearchInput from '../ui/SearchInput';
import TextArea from '../ui/TextArea';

import './AddContactModal.scss';

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

const AddContactModal: FC<OwnProps & StateProps> = ({
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
  const [isOpenAddContact, markIsOpenAddContact, unmarkIsOpenAddContact] = useFlag(true);

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

  const handleSendRequest = useCallback(() => {
    closeNewContactDialog();
  }, []);

  if (!isOpen && !isShown) {
    return undefined;
  }

  const profileId = '5018592946';

  return (
    <Modal
      className="AddContactModal"
      title="添加好友"
      isOpen={isOpen}
      onClose={handleClose}
      onCloseAnimationEnd={unmarkIsShown}
      hasCloseButton
    >
      <div className="profile-info">
        <ProfileInfo peerId={userId || ''} canPlayVideo={false} />
        <div className="input-block">
          <div className="input-title">发送好友申请</div>
          <TextArea maxLength={200} />
          <div className="send-button">
            <Button
              onClick={handleSendRequest}
              size="tiny"
              isRtl={lang.isRtl}
            >发送
            </Button>
          </div>
        </div>
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
)(AddContactModal));
