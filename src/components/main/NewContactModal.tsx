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
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import InputText from '../ui/InputText';
import Modal from '../ui/Modal';
import SearchInput from '../ui/SearchInput';
import ContactInfoModal from './ContactInfoModal';

import './NewContactModal.scss';

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

const NewContactModal: FC<OwnProps & StateProps> = ({
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
  const canBeSubmitted = Boolean(firstName && (!isByPhoneNumber || phone));

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

  const handleFirstNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumberWithCode(phoneCodeList, e.target.value));
  }, [phoneCodeList]);

  const handleLastNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
  }, []);

  const handleClose = useCallback(() => {
    closeNewContactDialog();
    setFirstName('');
    setLastName('');
    setPhone('');
  }, [closeNewContactDialog]);

  const handleSubmit = useCallback(() => {
    if (isByPhoneNumber || !userId) {
      importContact({
        firstName,
        lastName,
        phoneNumber: phone,
      });
    } else {
      updateContact({
        userId,
        firstName,
        lastName,
        shouldSharePhoneNumber,
      });
    }
  }, [firstName, importContact, isByPhoneNumber, lastName, phone, shouldSharePhoneNumber, updateContact, userId]);

  const onSearchQuery = useCallback((v) => {
    handlePhoneChange({
      target: {
        value: v,
      },
    });
  }, [handlePhoneChange]);

  if (!isOpen && !isShown) {
    return undefined;
  }

  function renderAddContact() {
    return (
      <>
        <div className="NewContactModal__profile" dir={lang.isRtl ? 'rtl' : undefined}>
          <Avatar
            size="jumbo"
            peer={renderingUser}
            text={`${firstName} ${lastName}`}
          />
          <div className="NewContactModal__profile-info">
            <p className="NewContactModal__phone-number">
              {renderingUser?.phoneNumber
                ? formatPhoneNumberWithCode(phoneCodeList, renderingUser.phoneNumber)
                : lang('MobileHidden')}
            </p>
            <span className="NewContactModal__user-status" dir="auto">
              {getUserStatus(lang, renderingUser!, userStatus)}
            </span>
          </div>
        </div>
        <InputText
          ref={inputRef}
          value={firstName}
          label={lang('FirstName')}
          tabIndex={0}
          onChange={handleFirstNameChange}
        />
        <InputText
          value={lastName}
          label={lang('LastName')}
          tabIndex={0}
          onChange={handleLastNameChange}
        />
        <p className="NewContactModal__help-text">
          {renderText(
            lang('NewContact.Phone.Hidden.Text', renderingUser?.firstName || ''),
            ['emoji', 'simple_markdown'],
          )}
        </p>
        <Checkbox
          checked={shouldSharePhoneNumber}
          tabIndex={0}
          onCheck={setShouldSharePhoneNumber}
          label={lang('lng_new_contact_share')}
        />
        <p className="NewContactModal__help-text">
          {renderText(lang('AddContact.SharedContactExceptionInfo', renderingUser?.firstName))}
        </p>
      </>
    );
  }

  function renderCreateContact() {
    return (
      <div className="NewContactModal__new-contact" dir={lang.isRtl ? 'rtl' : undefined}>
        <div className="NewContactModal__new-contact-fieldset">
          {/* <InputText
            ref={inputRef}
            value={phone}
            inputMode="tel"
            label={lang('lng_contact_phone')}
            tabIndex={0}
            onChange={handlePhoneChange}
          />
          <InputText
            value={lastName}
            label={lang('LastName')}
            tabIndex={0}
            onChange={handleLastNameChange}
          /> */}
          <SearchInput
            ref={inputRef}
            inputId="telegram-search-input"
            resultsItemSelector=".LeftSearch .ListItem-button"
            // className={buildClassName(
            //   (globalSearchChatId || searchDate) ? 'with-picker-item' : undefined,
            //   shouldHideSearch && 'SearchInput--hidden',
            // )}
            // value={isClosingSearch ? undefined : (contactsFilter || searchQuery)}
            value={phone}
            // focused={isSearchFocused}
            // isLoading={isLoading || connectionStatusPosition === 'minimized'}
            // spinnerColor={connectionStatusPosition === 'minimized' ? 'yellow' : undefined}
            // spinnerBackgroundColor={connectionStatusPosition === 'minimized' && theme === 'light' ? 'light' : undefined}
            // placeholder={searchInputPlaceholder}
            // autoComplete="off"
            // canClose={Boolean(globalSearchChatId || searchDate)}
            onChange={onSearchQuery}
            // onReset={onReset}
            // onFocus={handleSearchFocus}
            // onSpinnerClick={connectionStatusPosition === 'minimized' ? toggleConnectionStatus : undefined}
          >
            {/* {searchContent}
            <StoryToggler canShow={!isSearchFocused && !selectedSearchDate && !globalSearchChatId} /> */}
          </SearchInput>
          <InputText
            value={firstName}
            label={lang('FirstName')}
            tabIndex={0}
            onChange={handleFirstNameChange}
          />
          <p className="my-chatId">
            我的Chat ID:41551916
          </p>
        </div>
      </div>
    );
  }

  return (
    <Modal
      className="NewContactModal"
      title={lang('NewContact')}
      isOpen={isOpen}
      onClose={handleClose}
      onCloseAnimationEnd={unmarkIsShown}
      hasCloseButton
    >
      {/* {renderingUser && renderAddContact()} */}
      {renderingIsByPhoneNumber && renderCreateContact()}
      <div className="dialog-buttons">
        {/* <Button
          isText
          className="confirm-dialog-button"
          onClick={handleClose}
        >
          {lang('Cancel')}
        </Button>
        <Button
          isText
          className="confirm-dialog-button"
          disabled={!canBeSubmitted}
          onClick={handleSubmit}
        >
          {lang('Done')}
        </Button> */}
        <Button
          size="tiny"
          disabled={!canBeSubmitted}
          onClick={handleSubmit}
        >
          {lang('Search')}
        </Button>
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
)(NewContactModal));
