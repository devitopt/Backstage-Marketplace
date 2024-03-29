import { Tooltip } from "@material-ui/core";
import "owl.carousel/dist/assets/owl.carousel.css";
import "owl.carousel/dist/assets/owl.theme.default.css";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCookies } from "react-cookie";
import { isMobile } from "react-device-detect";
import OwlCarousel from "react-owl-carousel";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useToasts } from "react-toast-notifications";
import TicketBuyModal from "../../../components/custom_modals/ticket_buy_modal";
import EventCountDown1 from "../../../components/event_countdown1";
import { useAppContext } from "../../../context/AppContext";
import config from "../../../helper/config";
import {
  buyTicket,
  getBuyState,
  getCollectionById,
  getEventCardById,
  getLatestEventCards,
  updateEventLike,
} from "../../../helper/event";

// import * as nearAPI from "near-api-js";
import ReCAPTCHA from "react-google-recaptcha";
import { useUserContext } from "../../../context/UserContext";
import { createMessage } from "../../../helper/message";
import { getEventPrice, isVideoFile } from "../../../utils";

// const theme = createTheme({
//   palette: {
//     background: {
//       paper: "#fff",
//     },
//     text: {
//       primary: "#173A5E",
//       secondary: "#46505A",
//     },
//     action: {
//       active: "#001E3C",
//     },
//   },
// });

const PageEventCard = () => {
  const { id } = useParams();
  const { setLoading } = useAppContext();
  const { userInfo } = useUserContext();
  const [eventCard, setEventCard] = useState<any>(false);
  const [addons, setAddons] = useState<any>([]);
  const [collectionName, setCollectionName] = useState();
  const { addToast } = useToasts();
  const [latestEvents, setLatestEvents] = useState([]);
  const latestEventCarousel = useRef<typeof OwlCarousel>(null);
  const { setModal } = useAppContext();
  const navigate = useNavigate();
  const [cookies, setCookie] = useCookies();
  const [isSold, setSold] = useState(false);
  const [ticketAmount, setTicketAmount] = useState(1);

  // const { connect, keyStores, WalletConnection } = nearAPI;
  // const [searchParams, setSearchParams] = useSearchParams();
  const [searchParams] = useSearchParams();

  const recaptchaRef = React.createRef();
  const [captcha, setCaptcha] = useState(true);
  const [inputError, setInputError] = useState(false);

  const vRef = useRef();

  const onChangeCaptcha = (e: any) => {
    console.log(e);
    setCaptcha(e);
  };

  useEffect(() => {
    const func1 = async () => {
      // const keyStore = new keyStores.BrowserLocalStorageKeyStore();
      // const config = {
      //   networkId: "testnet",
      //   keyStore,
      //   nodeUrl: "https://rpc.testnet.near.org",
      //   walletUrl: "https://wallet.testnet.near.org",
      //   helperUrl: "https://helper.testnet.near.org",
      //   explorerUrl: "https://explorer.testnet.near.org",
      //   headers: {},
      // };
      // const near = await connect(config);
      // const wallet = new WalletConnection(near, null);

      addToast(
        "NEAR Wallet has been connected, Please buy your ticket on NEAR!",
        {
          appearance: "warning",
          autoDismiss: true,
        }
      );
      navigate(`/event/eventcard/${id}`);
    };

    const func2 = () => {
      setLoading(true);
      const param = JSON.parse(localStorage.getItem("buyInfo") || "{}");
      param.pay_order_id = searchParams.get("transactionHashes");
      buyTicket(param)
        .then((res) => {
          setLoading(false);
          if (res.success) {
            console.log(param);
            addToast("You bought the ticket", {
              appearance: "success",
              autoDismiss: true,
            });
            handleBought();
          } else {
            addToast("failed", { appearance: "error", autoDismiss: true });
          }
        })
        .catch((error) => {
          addToast("failed", { appearance: "error", autoDismiss: true });
        });
      setLoading(false);
      localStorage.removeItem("buyInfo");
      navigate(`/event/eventcard/${id}`);
    };

    if (searchParams.get("account_id")) func1();
    else if (searchParams.get("transactionHashes")) func2();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    getEventCardById(id).then((res) => {
      console.log(res);
      if (res.success) {
        setEventCard(res.eventcard);

        if (res.eventcard.total_tickets === res.eventcard.buy_count)
          setSold(true);

        const _addons =
          res.eventcard.addons === "" ? [] : JSON.parse(res.eventcard.addons);
        setAddons(_addons);

        getCollectionById(res.eventcard.collection).then((res) => {
          if (res.success) {
            console.log(res);
            setCollectionName(res.collection.name);
          }
        });
      }
    });

    getLatestEventCards().then((res) => {
      if (res.success) {
        console.log(res.eventcards);
        setLatestEvents(res.eventcards);
      }
    });

    console.log(id);

    // getBuyState(id)
    //   .then((res) => {
    //     if (res.success) {
    //       console.log("Already bought");
    //       // setSold(true);
    //     } else {
    //       console.log("You can buy");
    //     }
    //   })
    //   .catch((err) => {
    //     console.log(err);
    //   });
  }, [id]);

  const likeNumber: Number = useMemo(() => {
    let likes: any[] = [];
    try {
      likes = JSON.parse((eventCard as any).likes_number);
    } catch (err) {
      likes = [];
      console.log(err);
    }
    if (typeof likes !== "object") likes = [];
    if (likes) return likes.length;
    else return 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCard]);

  const onClickLike = (index: number) => {
    // if (!userInfo)
    return;
    let likes: any[] = [];
    try {
      likes = JSON.parse((latestEvents[index] as any).likes_number);
    } catch (err) {
      likes = [];
      console.log(err);
    }
    if (typeof likes !== "object") likes = [];
    console.log(likes);
    const userId = userInfo.user.id;
    if (likes.includes(userId)) {
      const index = likes.indexOf(userId);
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    updateEventLike({
      id: (latestEvents[index] as any).id,
      likes_number: JSON.stringify(likes),
    }).then((res) => {
      if (res.success) {
        const _eventCards = [...latestEvents];
        (_eventCards[index] as any).likes_number = JSON.stringify(likes);
        setLatestEvents(_eventCards);
      }
    });
  };

  const _onClickLike = () => {
    // if (!userInfo)
    return;
    let likes: any[] = [];
    try {
      likes = JSON.parse((eventCard as any).likes_number);
    } catch (err) {
      likes = [];
      console.log(err);
    }
    if (typeof likes !== "object") likes = [];
    console.log(likes);
    const userId = userInfo.user.id;
    if (likes.includes(userId)) {
      const index = likes.indexOf(userId);
      likes.splice(index, 1);
    } else {
      likes.push(userId);
    }
    updateEventLike({
      id: (eventCard as any).id,
      likes_number: JSON.stringify(likes),
    }).then((res) => {
      if (res.success) {
        setEventCard({ ...eventCard, likes_number: JSON.stringify(likes) });
      }
    });
  };

  const next = (eleRf: any) => {
    const ele: any = eleRf.current;
    ele.next(500);
  };

  const prev = (eleRf: any) => {
    const ele: any = eleRf.current;
    ele.prev(500);
  };

  const telegramUrl = (username: string) => {
    let temp;
    if (username.length > 0 && username.substr(0, 1) === "@") {
      temp = username.substr(1, username.length - 1);
    } else {
      temp = username;
    }

    return "https://t.me/" + temp;
  };

  const wholeLink = (link: string) => {
    if (link.split("//").length === 1) {
      return "https://" + link;
    } else {
      return link;
    }
  };

  const handleBuyTicket = () => {
    //hushi signup test
    // console.log("hushi cook", cookies)
    if (isNaN(Number(ticketAmount)) || Number(ticketAmount) <= 0) {
      setInputError(true);
      return;
    }

    if (Boolean(cookies.userInfo)) {
      if (eventCard.total_tickets <= eventCard.buy_count) {
        addToast("Already sold full amount of tickets", {
          appearance: "error",
          autoDismiss: true,
        });
        return;
      } else if (
        eventCard.buy_count + Number(ticketAmount) >
        eventCard.total_tickets
      ) {
        addToast(
          `Only ${eventCard.total_tickets -
            eventCard.buy_count} tickets are left`,
          {
            appearance: "error",
            autoDismiss: true,
          }
        );
        return;
      }

      setModal({
        open: true,
        children: (
          <TicketBuyModal
            amount={Number(ticketAmount)}
            eventCard={eventCard}
            handleEnd={handleBought}
          />
        ),
      });
      return;
    } else {
      const url = `/event/eventcard/${id}`;
      setCookie("userRedirect", url);
      navigate("/signin");
    }
  };

  const handleBought = () => {
    console.log("bought", userInfo);
    // setSold(true);

    createMessage({
      receiver: userInfo.user.email,
      link: `${config.API_BASE_URL}/api/upload/get_file?path=${eventCard.picture_small}`,
      content: `You bought a ticket of ${eventCard.name} on BKS Backstage`,
    }).then((res) => {
      if (res.success) {
        addToast("Sent Email", {
          appearance: "success",
          autoDismiss: true,
        });
      } else {
        addToast("failed", { appearance: "error", autoDismiss: true });
      }
    });

    if (
      Boolean(cookies?.userInfo) &&
      cookies.userInfo.user.user_type === "ADMIN"
    ) {
      navigate("/admin/activity");
    } else {
      navigate("/activity");
    }

    // navigate(
    //   userInfo && userInfo.user.user_type === "ADMIN"
    //     ? "/admin/activity"
    //     : "/activity"
    // );
  };

  // const copyLink = () => {
  //   const url = `${config.SITE_URL}/event/eventcard/${id}`;
  //   navigator.clipboard.writeText(url);
  //   addToast("Copied the link to clipboard", {
  //     appearance: "success",
  //     autoDismiss: true,
  //   });
  // };

  const toolTipText = (addon: any) => {
    return (
      <div className="addon-tooltip">
        <p></p>
        <p>
          <b>Name:</b> {addon.name}
        </p>
        <p>
          <b>Description:</b> {addon.description}
        </p>
        <p>
          <b>Price:</b> {addon.price} €
        </p>
      </div>
    );
  };

  return (
    <div
      className="container"
      style={{ padding: isMobile ? 20 : 0, paddingBottom: 300, zIndex: 999 }}
    >
      {isMobile ? (
        <div className="article__top">
          <div onClick={() => navigate("/explorer")}>
            <img src="/img/icons/arrow-left.svg" alt="" />
          </div>
        </div>
      ) : (
        <div className="row row--grid">
          <div className="col-12">
            <ul className="breadcrumb">
              <li className="breadcrumb__item">
                <Link to="/">Home</Link>
              </li>
              <li className="breadcrumb__item">
                <Link to="/author">Author</Link>
              </li>
              <li className="breadcrumb__item breadcrumb__item--active">
                Item
              </li>
            </ul>
          </div>
        </div>
      )}

      {eventCard ? (
        <div className="assets__container">
          {/* <div className="col-12">
              <div
                className="main__title main__title--page"
                style={{ justifyContent: "inherit" }}
              >
                <h1>{eventCard.name}</h1>
                {eventCard.green_pass_needed ? (
                  <span className="greenpass">
                    <img
                      src="/img/icons/icon-check.png"
                      alt=""
                      style={{ width: "40px" }}
                    />
                    <span className="greenpass-text">
                      Greenpass
                      <br />
                      Required
                    </span>
                  </span>
                ) : (
                  ""
                )}
              </div>
            </div> */}

          <div className="asset__item">
            <a href="/" className="asset__img">
              {isVideoFile(eventCard.picture_large) ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    overflowX: "hidden",
                  }}
                >
                  <video
                    autoPlay
                    playsInline
                    loop
                    muted
                    style={{ width: "auto", height: "100%" }}
                    ref={vRef as any}
                  >
                    <source
                      src={`${config.API_BASE_URL}/api/upload/get_file?path=${eventCard.picture_large}`}
                      type="video/mp4"
                    />
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <img
                  src={`${config.API_BASE_URL}/api/upload/get_file?path=${eventCard.picture_large}`}
                  alt=""
                  style={{ width: "100%" }}
                />
              )}
            </a>
            {/* <div className="share share--asset">
                  {eventCard.facebook ? (
                    <a
                      href={wholeLink(eventCard.facebook)}
                      className="share__link share__link--fb"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="9"
                        height="17"
                        viewBox="0 0 9 17"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M5.56341 16.8197V8.65888H7.81615L8.11468 5.84663H5.56341L5.56724 4.43907C5.56724 3.70559 5.63693 3.31257 6.69042 3.31257H8.09873V0.5H5.84568C3.1394 0.5 2.18686 1.86425 2.18686 4.15848V5.84695H0.499939V8.6592H2.18686V16.8197H5.56341Z" />
                      </svg>
                      <span>facebook</span>
                    </a>
                  ) : (
                    ""
                  )}
                  {eventCard.twitter ? (
                    <a
                      href={wholeLink(eventCard.twitter)}
                      className="share__link share__link--tw"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="16"
                        height="12"
                        viewBox="0 0 16 12"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M7.55075 3.19219L7.58223 3.71122L7.05762 3.64767C5.14804 3.40404 3.47978 2.57782 2.06334 1.1902L1.37085 0.501686L1.19248 1.01013C0.814766 2.14353 1.05609 3.34048 1.843 4.14552C2.26269 4.5904 2.16826 4.65396 1.4443 4.38914C1.19248 4.3044 0.972149 4.24085 0.951164 4.27263C0.877719 4.34677 1.12953 5.31069 1.32888 5.69202C1.60168 6.22165 2.15777 6.74068 2.76631 7.04787L3.28043 7.2915L2.67188 7.30209C2.08432 7.30209 2.06334 7.31268 2.12629 7.53512C2.33613 8.22364 3.16502 8.95452 4.08833 9.2723L4.73884 9.49474L4.17227 9.8337C3.33289 10.321 2.34663 10.5964 1.36036 10.6175C0.888211 10.6281 0.5 10.6705 0.5 10.7023C0.5 10.8082 1.78005 11.4014 2.52499 11.6344C4.75983 12.3229 7.41435 12.0264 9.40787 10.8506C10.8243 10.0138 12.2408 8.35075 12.9018 6.74068C13.2585 5.88269 13.6152 4.315 13.6152 3.56293C13.6152 3.07567 13.6467 3.01212 14.2343 2.42953C14.5805 2.09056 14.9058 1.71983 14.9687 1.6139C15.0737 1.41264 15.0632 1.41264 14.5281 1.59272C13.6362 1.91049 13.5103 1.86812 13.951 1.39146C14.2762 1.0525 14.6645 0.438131 14.6645 0.258058C14.6645 0.22628 14.5071 0.279243 14.3287 0.374576C14.1398 0.480501 13.7202 0.639389 13.4054 0.734722L12.8388 0.914795L12.3247 0.565241C12.0414 0.374576 11.6427 0.162725 11.4329 0.0991699C10.8978 -0.0491255 10.0794 -0.0279404 9.59673 0.14154C8.2852 0.618204 7.45632 1.84694 7.55075 3.19219Z" />
                      </svg>
                      <span>tweet</span>
                    </a>
                  ) : (
                    ""
                  )}
                  {eventCard.instagram ? (
                    <a
                      href={wholeLink(eventCard.instagram)}
                      className="share__link share__link--in"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="20px"
                        height="20px"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M20.947 8.305a6.53 6.53 0 0 0-.419-2.216 4.61 4.61 0 0 0-2.633-2.633 6.606 6.606 0 0 0-2.186-.42c-.962-.043-1.267-.055-3.709-.055s-2.755 0-3.71.055a6.606 6.606 0 0 0-2.185.42 4.607 4.607 0 0 0-2.633 2.633 6.554 6.554 0 0 0-.419 2.185c-.043.963-.056 1.268-.056 3.71s0 2.754.056 3.71c.015.748.156 1.486.419 2.187a4.61 4.61 0 0 0 2.634 2.632 6.584 6.584 0 0 0 2.185.45c.963.043 1.268.056 3.71.056s2.755 0 3.71-.056a6.59 6.59 0 0 0 2.186-.419 4.615 4.615 0 0 0 2.633-2.633c.263-.7.404-1.438.419-2.187.043-.962.056-1.267.056-3.71-.002-2.442-.002-2.752-.058-3.709zm-8.953 8.297c-2.554 0-4.623-2.069-4.623-4.623s2.069-4.623 4.623-4.623a4.623 4.623 0 0 1 0 9.246zm4.807-8.339a1.077 1.077 0 0 1-1.078-1.078 1.077 1.077 0 1 1 2.155 0c0 .596-.482 1.078-1.077 1.078z" />
                        <circle cx="11.994" cy="11.979" r="3.003" />
                      </svg>
                      <span>instagram</span>
                    </a>
                  ) : (
                    ""
                  )}
                  {eventCard.telegram ? (
                    <a
                      href={wholeLink(telegramUrl(eventCard.telegram))}
                      className="share__link share__link--te"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="16px"
                        height="16px"
                        viewBox="0 0 24 24"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M23.91 3.79L20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.72 0-.6-.27-.84-.95L6.3 13.7l-5.45-1.7c-1.18-.35-1.19-1.16.26-1.75l21.26-8.2c.97-.43 1.9.24 1.53 1.73z" />
                      </svg>
                      <span>telegram</span>
                    </a>
                  ) : (
                    ""
                  )}
                  {eventCard.discord ? (
                    <a
                      href={wholeLink(eventCard.discord)}
                      className="share__link share__link--discord"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="18px"
                        height="18px"
                        viewBox="0 0 24 24"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span>discord</span>
                    </a>
                  ) : (
                    ""
                  )}
                  {eventCard.tiktok ? (
                    <a
                      href={wholeLink(eventCard.tiktok)}
                      className="share__link share__link--tiktok"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="15px"
                        height="18px"
                        viewBox="0 0 24 24"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>TikTok icon</title>
                        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                      <span>tiktok</span>
                    </a>
                  ) : (
                    ""
                  )}
                </div>
                <button
                  className="asset__likes"
                  type="button"
                  onClick={onClickLike}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20.16,5A6.29,6.29,0,0,0,12,4.36a6.27,6.27,0,0,0-8.16,9.48l6.21,6.22a2.78,2.78,0,0,0,3.9,0l6.21-6.22A6.27,6.27,0,0,0,20.16,5Zm-1.41,7.46-6.21,6.21a.76.76,0,0,1-1.08,0L5.25,12.43a4.29,4.29,0,0,1,0-6,4.27,4.27,0,0,1,6,0,1,1,0,0,0,1.42,0,4.27,4.27,0,0,1,6,0A4.29,4.29,0,0,1,18.75,12.43Z" />
                  </svg>
                  <span>{Number(eventCard.likes_number)}</span>
                </button> */}
          </div>
          <div className="asset__info">
            {/* Name */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <p className="asset__name">{eventCard.name}</p>
              <div style={{ display: "flex", alignItems: "center" }}>
                <button
                  className="card__likes"
                  type="button"
                  onClick={_onClickLike}
                >
                  {userInfo &&
                  eventCard.likes_number &&
                  eventCard.likes_number.includes(userInfo.user.id) ? (
                    <img src="/img/icons/liked_blue.svg" alt="" />
                  ) : (
                    <img src="/img/icons/liked_white.svg" alt="" />
                  )}
                </button>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.66)",
                    fontSize: 14,
                    fontWeight: 400,
                    margin: 0,
                    paddingLeft: 8,
                  }}
                >
                  {likeNumber}
                </p>
              </div>
            </div>
            <p className="asset__desc">{eventCard.venue_description}</p>
            {!isMobile && <div style={{ flex: 1 }}></div>}
            <div className="asset__author">
              <div className="asset__author--items">
                <div className="asset__author-item">
                  <p className="text__small-title">Creator</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Link to="/author" style={{ color: "#fff" }}>
                      {eventCard.creator.name}
                    </Link>
                    <img
                      src="/img/icons/verified.svg"
                      alt=""
                      style={{ height: 16, marginLeft: 8 }}
                    />
                  </div>
                </div>
                <div className="asset__author-item">
                  <p className="text__small-title">Location</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <p className="text__small-val">{eventCard.location}</p>
                  </div>
                </div>
              </div>
              <div className="asset__author--items">
                <div className="asset__author-item">
                  <p className="text__small-title">Date</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <p className="text__small-val">
                      {
                        new Date(eventCard.date)
                          .toISOString()
                          .toString()
                          .split("T")[0]
                      }
                    </p>
                  </div>
                </div>
                <div className="asset__author-item">
                  <p className="text__small-title">Time</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <p className="text__small-val">
                      {" "}
                      {
                        new Date(eventCard.date)
                          .toISOString()
                          .toString()
                          .split("T")[1]
                          .split(".")[0]
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="asset__collection">
              <div className="asset__author--items">
                <div className="asset__author-item">
                  <p className="text__small-title">Collection</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <img
                      src="/img/avatars/avatar5.jpg"
                      alt=""
                      className="asset__collection-img"
                    />
                    <Link
                      to={`/collection/${eventCard.collection}`}
                      style={{ color: "#fff" }}
                    >
                      {/* {collectionName} */}Fed
                    </Link>
                  </div>
                </div>
                <div className="asset__author-item">
                  <p className="text__small-title">Addons</p>
                  {addons.length ? (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {addons.map((addon: any) => (
                        <Tooltip title={toolTipText(addon)} arrow>
                          <img
                            src={addon.icon}
                            alt={addon.name}
                            className="asset__collection-img"
                          />
                        </Tooltip>
                      ))}
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              </div>
            </div>
            <div className="asset__timing">
              <div style={{ display: "flex", alignItems: "center" }}>
                <img
                  src="/img/icons/clock.svg"
                  alt=""
                  style={{
                    height: 16,
                    width: 16,
                    marginRight: 8,
                  }}
                />
                <p className="text__small-title">Event Starts in</p>
              </div>
              <EventCountDown1 date={eventCard.date} />
            </div>
            <div style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <p className="asset__desc">
                  {eventCard.total_tickets - eventCard.buy_count} ticket
                  {eventCard.total_tickets - eventCard.buy_count > 1
                    ? "s"
                    : ""}{" "}
                  left
                </p>
                <p className="asset__name">{getEventPrice(eventCard)}€</p>
              </div>
              {!captcha && (
                <div
                  style={{
                    color: "white",
                    // marginTop: "10px",
                  }}
                >
                  Before you proceed, please complete the captcha below
                </div>
              )}
              {!captcha && (
                <ReCAPTCHA
                  style={{
                    marginTop: "15px",
                    marginBottom: "15px",
                  }}
                  ref={recaptchaRef as any}
                  // size="invisible"
                  sitekey="6LeaLwUgAAAAAIBN0ef2xzTx0rIfuLb1POyzr_ei"
                  // sitekey="6Lf4RAUgAAAAAJbw7qXWVBfVtM2Ocggfs0KYGPjv"
                  onChange={onChangeCaptcha}
                />
              )}
              <div style={{ display: "flex" }}>
                <div className="assets__amount">
                  <p
                    onClick={() => {
                      if (ticketAmount > 1) setTicketAmount(ticketAmount - 1);
                    }}
                  >
                    -
                  </p>
                  <p className="assets__amount-number">{ticketAmount}</p>
                  <p
                    onClick={() => {
                      if (ticketAmount < 10) setTicketAmount(ticketAmount + 1);
                    }}
                  >
                    +
                  </p>
                </div>
                <button
                  className={
                    !isSold && captcha ? "buy__btn" : "buy__btn-disable"
                  }
                  onClick={!isSold && captcha ? handleBuyTicket : () => {}}
                  // onClick={handleBuyTicket}
                >
                  {isSold ? "Sold Out" : "Buy Ticket"}
                </button>
              </div>
            </div>

            {/* <div className="asset__btns">
                {inputError && (
                  <span className="text-error">
                    Ticket amount should be more than 0*
                  </span>
                )}
                {!captcha && (
                  <div
                    style={{
                      color: "white",
                      marginTop: "10px",
                    }}
                  >
                    Before you proceed, please complete the captcha below
                  </div>
                )}
                {!captcha && (
                  <ReCAPTCHA
                    style={{
                      marginTop: "15px",
                    }}
                    ref={recaptchaRef as any}
                    // size="invisible"
                    sitekey="6LeaLwUgAAAAAIBN0ef2xzTx0rIfuLb1POyzr_ei"
                    // sitekey="6Lf4RAUgAAAAAJbw7qXWVBfVtM2Ocggfs0KYGPjv"
                    onChange={onChangeCaptcha}
                  />
                )}
                <button
                  className={`asset__btn asset__btn--full open-modal ${
                    !isSold && captcha
                      ? "asset__btn--clr"
                      : "asset__btn--disable"
                  }`}
                  // disabled={eventCard.total_tickets == eventCard.buy_count}
                  onClick={!isSold && captcha ? handleBuyTicket : () => {}}
                >
                  {isSold ? "Sold Out" : "Buy Ticket"}
                </button>
              </div> */}
          </div>
        </div>
      ) : (
        ""
      )}

      {!isMobile && (
        <section className="row row--grid">
          <div className="col-12">
            <div className="main__title main__title--border-top">
              <h2>
                <Link to="/explorer" style={{ fontWeight: 700 }}>
                  Other author assets
                </Link>
              </h2>
            </div>
          </div>

          {latestEvents.length > 0 ? (
            <div style={{ width: "100%" }}>
              <div
                className="carousel-wrapper"
                style={{ position: "relative" }}
              >
                <div className="nav-wrapper">
                  <button
                    className="main__nav main__nav--prev"
                    type="button"
                    onClick={() => prev(latestEventCarousel)}
                  >
                    <svg
                      width="45"
                      height="45"
                      viewBox="0 0 45 45"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="22.3677"
                        cy="22.9785"
                        r="22"
                        transform="rotate(-180 22.3677 22.9785)"
                        fill="#14142F"
                      />
                      <circle
                        cx="22.3677"
                        cy="22.9785"
                        r="21.5"
                        transform="rotate(-180 22.3677 22.9785)"
                        stroke="white"
                        stroke-opacity="0.33"
                      />
                      <path
                        d="M25.3677 16.9785L19.3677 22.9785L25.3677 28.9785"
                        stroke="white"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    className="main__nav main__nav--next"
                    type="button"
                    onClick={() => next(latestEventCarousel)}
                  >
                    <svg
                      width="45"
                      height="45"
                      viewBox="0 0 45 45"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="22.3677" cy="22.9785" r="22" fill="#14142F" />
                      <circle
                        cx="22.3677"
                        cy="22.9785"
                        r="21.5"
                        stroke="white"
                        stroke-opacity="0.33"
                      />
                      <path
                        d="M19.3677 28.9785L25.3677 22.9785L19.3677 16.9785"
                        stroke="white"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <OwlCarousel
                  className="owl-theme"
                  margin={30}
                  items={4}
                  autoplay
                  loop={
                    latestEvents.length < 4 ? (isMobile ? true : false) : true
                  }
                  dots={false}
                  ref={latestEventCarousel as any}
                >
                  {/* {lastestEventsEle()} */}
                  {latestEvents.map((eventcardItem: any, i) => {
                    return (
                      <div
                        key={`explorer_event_${i}`}
                        className="card"
                        style={{ marginLeft: 12 }}
                      >
                        <Link
                          to={`/event/eventcard/${eventcardItem.id}`}
                          className="card__cover"
                        >
                          <img
                            src={`${config.API_BASE_URL}/api/upload/get_file?path=${eventcardItem.picture_small}`}
                            alt=""
                          />
                        </Link>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: "100%",
                            paddingLeft: 20,
                            paddingRight: 20,
                          }}
                        >
                          <h3 className="explorer__card-title">
                            <Link to={`/event/eventcard/${eventcardItem.id}`}>
                              {eventcardItem.name}
                            </Link>
                          </h3>
                          <div className="text__location">
                            <div className="text__location-item">
                              <p className="text__card-key">Collection</p>
                              <div className="card__author">
                                <img src="/img/avatars/avatar5.jpg" alt="" />
                                <Link to="/author">cName</Link>
                              </div>
                            </div>
                            <div className="text__location-item">
                              <p className="text__card-key">Creator</p>
                              <div className="card__author">
                                {eventcardItem.creator.avatar ? (
                                  <img
                                    // src={`${config.API_BASE_URL}/api/upload/get_file?path=${eventCard.creator.avatar}`}
                                    src={`${eventcardItem.creator.avatar}`}
                                    alt=""
                                  />
                                ) : (
                                  <img src="/img/avatars/avatar.jpg" alt="" />
                                )}
                                <Link to="/author">
                                  {eventcardItem.creator.name}
                                </Link>
                              </div>
                            </div>
                          </div>

                          <div className="card__explorer-info">
                            <div className="card__price">
                              <p className="text__location-key">
                                Reserve price
                              </p>
                              <p className="text__location-price">
                                {getEventPrice(eventcardItem)} €
                              </p>
                            </div>

                            <button
                              className="card__likes"
                              type="button"
                              onClick={() => onClickLike(i)}
                            >
                              {userInfo &&
                              eventcardItem.likes_number &&
                              eventcardItem.likes_number.includes(
                                userInfo.user.id
                              ) ? (
                                <img src="/img/icons/liked_blue.svg" alt="" />
                              ) : (
                                <img src="/img/icons/liked_white.svg" alt="" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </OwlCarousel>
              </div>
            </div>
          ) : (
            ""
          )}
        </section>
      )}
    </div>
  );
};

export default PageEventCard;
