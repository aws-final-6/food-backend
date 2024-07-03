const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");

const { pool } = require("../scripts/connectMySQL");
const { validateSession, deleteSession } = require("../utils/sessionUtils"); // 유틸리티 함수 임포트
const { errLog } = require("../utils/logUtils");

require("dotenv").config();
router.use(express.json());

// BaseUrl : /auth

// .env kakao OAuth
const kakaoReq = {
  client_id: process.env.KAKAO_CLIENT_ID, // string, 앱 REST API 키 (내 애플리케이션 > 앱 키)
  client_secret: process.env.KAKAO_CLIENT_SECRET,
  redirect_uri: process.env.KAKAO_REDIRECT_URI, // string, 인가 코드를 전달받을 client의 URI
  scope: process.env.KAKAO_SCOPE, // string, 쉼표로 구분해 여러 개 전달 가능, OpenID Connect사용하기 때문에 파라미터 값에 openid 포함 필요, 미포함 시 ID토큰이 재발급되지 않음
  // scope는 추후에 필요 없으면 제거할 것
};

// .env naver OAuth
const naverReq = {
  client_id: process.env.NAVER_CLIENT_ID,
  client_secret: process.env.NAVER_CLIENT_SECRET,
  redirect_uri: process.env.NAVER_REDIRECT_URI,
  state: process.env.NAVER_STATE,
};

// .env google OAuth
const googleReq = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  scope: encodeURIComponent(process.env.GOOGLE_SCOPE),
};

// .env front uri
const front_uri = process.env.FRONT_URI;

// AUTH_01 : 토큰검증
router.post("/checkToken", async (req, res) => {
  const { user_id, user_provider, access_token } = req.body;

  // 0. 유효한 user_provider 목록
  const validProviders = ["kakao", "naver", "google"];

  // 1. user_provider가 유효하지 않은 경우 예외 처리
  if (!validProviders.includes(user_provider)) {
    errLog("AUTH_01", 400, "Bad Request", { user_provider: user_provider });
    return res
      .status(400)
      .json({ message: "유효하지 않은 프로바이더 입니다." });
  }

  // 2-1. user_id와 access_token을 받지 못했을 때 - 프론트에서 아예 값을 가지고 있지 않을 때 (최초, 혹은 회원가입 취소 시 등)
  if (!user_id || !access_token) {
    errLog("AUTH_01", 400, "Bad Request", {
      message: "user_id 또는 access_token이 제공되지 않았습니다.",
    });
    return res
      .status(400)
      .json({ message: "user_id 또는 access_token이 제공되지 않았습니다." });
  }

  try {
    // 2-2. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
    const isValidSession = await validateSession(user_id, access_token);
    if (!isValidSession) {
      errLog("AUTH_01", 401, "Unauthorized", { user_id: user_id });
      return res
        .status(401)
        .json({ message: "user_id와 access_token이 일치하지 않습니다." });
    }

    // 3. switch-case문으로 user_provider값에 따라 코드 실행
    switch (user_provider) {
      // 3-1. kakao
      case "kakao":
        const kakaoAuthURL = `https://kapi.kakao.com/v1/user/access_token_info`;
        try {
          // 3-1-1. 유효할 경우 200
          const response = await axios.get(kakaoAuthURL, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          // 3-1-2. 유효하지 않은 경우 419, Session Table에서 user_id, access_token 삭제
          if (err.response && err.response.status === 401) {
            await deleteSession(user_id);
            errLog("AUTH_01", 419, "Token Expired", { user_id: user_id });
            res
              .status(419)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            errLog("AUTH_01", 500, "Internal Server Error", {
              user_id: user_id,
              error: err.message,
            });
            res.status(500).json({
              message: "카카오 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;
      // 3-2. naver
      case "naver":
        const naverAuthURL = `https://openapi.naver.com/v1/nid/me`;
        try {
          // 3-2-1. 유효할 경우 200
          const response = await axios.get(naverAuthURL, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          // 3-2-2. 유효하지 않은 경우 419, Session Table에서 user_id, access_token 삭제
          if (err.response && err.response.status === 401) {
            await deleteSession(user_id);
            errLog("AUTH_01", 419, "Token Expired", { user_id: user_id });
            res
              .status(419)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            errLog("AUTH_01", 500, "Internal Server Error", {
              user_id: user_id,
              error: err.message,
            });
            res.status(500).json({
              message: "네이버 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;
      // 3-3. google
      case "google":
        const googleAuthURL = `https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`;
        try {
          // 3-3-1. 유효할 경우 200
          const response = await axios.get(googleAuthURL);
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          // 3-3-2. 유효하지 않은 경우 419, Session Table에서 user_id, access_token 삭제
          if (err.response && err.response.status === 400) {
            await deleteSession(user_id);
            errLog("AUTH_01", 419, "Token Expired", { user_id: user_id });
            res
              .status(419)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            errLog("AUTH_01", 500, "Internal Server Error", {
              user_id: user_id,
              error: err.message,
            });
            res.status(500).json({
              message: "구글 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;
      default:
        errLog("AUTH_01", 500, "Internal Server Error", {
          user_id: user_id,
          user_provider: user_provider,
        });
        res.status(500).json({
          message: "토큰 검증에 실패했습니다. 다시 시도해주세요.",
        });
    }
  } catch (err) {
    errLog("AUTH_01", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res.status(500).json({
      message: "토큰 검증에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// AUTH_02 : 토큰요청
router.post("/requestToken", function (req, res) {
  const { user_provider } = req.body;

  // 0. 유효한 user_provider 목록
  const validProviders = ["kakao", "naver", "google"];

  // 1. user_provider가 유효하지 않은 경우 예외 처리
  if (!validProviders.includes(user_provider)) {
    errLog("AUTH_02", 400, "Bad Request", { user_provider: user_provider });
    return res
      .status(400)
      .json({ message: "유효하지 않은 프로바이더 입니다." });
  }

  try {
    // 2. user_provider값에 따른 switch-case 처리
    switch (user_provider) {
      // 2-1. kakao
      case "kakao":
        const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoReq.client_id}&redirect_uri=${kakaoReq.redirect_uri}&scope=${kakaoReq.scope}`;
        res.status(200).send(kakaoAuthURL);
        break;
      // 2-2. naver
      case "naver":
        const naverAuthURL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naverReq.client_id}&redirect_uri=${naverReq.redirect_uri}&state=${naverReq.state}`;
        res.status(200).send(naverAuthURL);
        break;
      // 2-3. google
      case "google":
        const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleReq.client_id}&redirect_uri=${googleReq.redirect_uri}&scope=${googleReq.scope}`;
        res.status(200).send(googleAuthURL);
        break;
      // 2-4. default - 500 err
      default:
        errLog("AUTH_02", 500, "Internal Server Error", {
          user_provider: user_provider,
        });
        res.status(500).json({
          message: "토큰 발급 요청에 실패했습니다. 다시 시도해주세요.",
        });
    }
  } catch (err) {
    errLog("AUTH_02", 500, "Internal Server Error", { error: err.message });
    res
      .status(500)
      .json({ message: "토큰 발급 요청에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_03 : 토큰재발급
router.post("/refreshToken", async (req, res) => {
  const { user_provider, refresh_token } = req.body;

  // 0-1. 유효한 user_provider 목록
  const validProviders = ["kakao", "naver", "google"];

  // 0-2. user_provider가 유효하지 않은 경우 예외 처리
  if (!validProviders.includes(user_provider)) {
    errLog("AUTH_03", 400, "Bad Request", { user_provider: user_provider });
    return res
      .status(400)
      .json({ message: "유효하지 않은 프로바이더 입니다." });
  }

  // 1. user_provider에 따라 switch - case
  try {
    switch (user_provider) {
      // 1-1-1. kakao
      case "kakao":
        const kakaoURL = "https://kauth.kakao.com/oauth/token";
        const tokenData = {
          grant_type: "refresh_token",
          client_id: kakaoReq.client_id,
          client_secret: kakaoReq.client_secret,
          refresh_token,
        };

        try {
          const response = await axios.post(kakaoURL, qs.stringify(tokenData), {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
          });

          // 1-1-2. 결과로 갱신된 access_token, refresh_token을 받게됨
          const { access_token, refresh_token: new_refresh_token } =
            response.data;

          // 1-1-3. 받아온 access_token을 이용해 user_id를 받아옴
          const userInfoUrl = "https://kapi.kakao.com/v2/user/me";
          const userInfoResponse = await axios.get(userInfoUrl, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const userInfo = userInfoResponse.data;
          const user_id = String(userInfo.id);

          // 1-1-4. Session 테이블에 갱신된 토큰 정보를 업데이트
          await pool.query(
            "UPDATE Session SET access_token = ? WHERE user_id = ?",
            [access_token, user_id]
          );

          res.status(200).json({ user_id, access_token, refresh_token });
        } catch (err) {
          errLog("AUTH_03", 500, "Internal Server Error", {
            user_provider: user_provider,
            error: err.message,
          });
          res.status(500).json({
            message: "카카오 토큰 갱신에 실패했습니다. 다시 시도해주세요.",
          });
        }
        break;
      // 1-2-1. naver
      case "naver":
        const naverURL = "https://nid.naver.com/oauth2.0/token";
        const naverTokenData = {
          grant_type: "refresh_token",
          client_id: naverReq.client_id,
          client_secret: naverReq.client_secret,
          refresh_token,
        };

        try {
          // 1-2-1. refresh_token을 사용하여 새로운 access_token, refresh_token 요청
          const naverResponse = await axios.post(
            naverURL,
            qs.stringify(naverTokenData),
            {
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=utf-8",
              },
            }
          );

          // 1-2-2. 결과로 갱신된 access_token, refresh_token을 받게됨
          const { access_token, refresh_token: new_refresh_token } =
            naverResponse.data;

          // 1-2-3. 받아온 access_token을 이용해 user_id를 받아옴
          const userInfoUrl = "https://openapi.naver.com/v1/nid/me";
          const userInfoResponse = await axios.get(userInfoUrl, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const userInfo = userInfoResponse.data.response;
          const user_id = String(userInfo.id);

          // 1-2-4. Session 테이블에 갱신된 토큰 정보를 업데이트
          await pool.query(
            "UPDATE Session SET access_token = ? WHERE user_id = ?",
            [access_token, user_id]
          );

          res.status(200).json({ user_id, access_token, refresh_token });
        } catch (err) {
          errLog("AUTH_03", 500, "Internal Server Error", {
            user_provider: user_provider,
            error: err.message,
          });
          res.status(500).json({
            message: "네이버 토큰 갱신에 실패했습니다. 다시 시도해주세요.",
          });
        }
        break;

      // 1-3-1. google
      case "google":
        const googleURL = "https://oauth2.googleapis.com/token";
        const googleTokenData = {
          grant_type: "refresh_token",
          client_id: googleReq.client_id,
          client_secret: googleReq.client_secret,
          refresh_token,
        };

        try {
          // 1-3-2. refresh_token을 사용하여 새로운 access_token, refresh_token 요청
          const googleResponse = await axios.post(
            googleURL,
            qs.stringify(googleTokenData),
            {
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded;charset=utf-8",
              },
            }
          );

          // 1-3-3. 결과로 갱신된 access_token, refresh_token을 받게됨
          const { access_token, refresh_token: new_refresh_token } =
            googleResponse.data;

          // 1-3-4. 받아온 access_token을 이용해 user_id를 받아옴
          const userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
          const userInfoResponse = await axios.get(userInfoUrl, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const userInfo = userInfoResponse.data;
          const user_id = String(userInfo.id);

          // 1-3-5. Session 테이블에 갱신된 토큰 정보를 업데이트
          await pool.query(
            "UPDATE Session SET access_token = ? WHERE user_id = ?",
            [access_token, user_id]
          );

          res.status(200).json({ user_id, access_token, refresh_token });
        } catch (err) {
          errLog("AUTH_03", 500, "Internal Server Error", {
            user_provider: user_provider,
            error: err.message,
          });
          res.status(500).json({
            message: "구글 토큰 갱신에 실패했습니다. 다시 시도해주세요.",
          });
        }
      default:
        errLog("AUTH_03", 500, "Internal Server Error", {
          user_provider: user_provider,
        });
        res.status(500).json({
          message: "토큰 검증에 실패했습니다. 다시 시도해주세요.",
        });
    }
  } catch (err) {
    errLog("AUTH_03", 500, "Internal Server Error", {
      user_provider: user_provider,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "토큰 재발급 요청에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_04 : 카카오 리다이렉트
router.get("/kakao/redirect", async (req, res) => {
  // 0. authorization code를 AUTH_02에서 받아옴
  const { code } = req.query;
  const tokenUrl = "https://kauth.kakao.com/oauth/token";
  const tokenData = {
    grant_type: "authorization_code",
    client_id: kakaoReq.client_id,
    redirect_uri: kakaoReq.redirect_uri,
    client_secret: kakaoReq.client_secret,
    code, // authorization code
  };

  // 1. access_token 발급
  try {
    const response = await axios.post(tokenUrl, qs.stringify(tokenData), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const { access_token, refresh_token } = response.data;

    // 2. access_token을 사용하여 사용자 정보 가져오기
    const userInfoUrl = "https://kapi.kakao.com/v2/user/me";
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userInfoResponse.data;
    const user_id = String(userInfo.id);
    const user_email = userInfo.kakao_account.email;

    // 2-1. 사용자 정보 중 고유값인 id를 추출하여 User collection에 있는지(회원인지) 확인
    const [rows] = await pool.query("SELECT * FROM User WHERE user_id = ?", [
      user_id,
    ]);

    if (rows.length === 0) {
      // 2-2. DB에 없을 경우, 회원가입으로 넘어가도록 함, 유저정보 저장하지 않음
      res.status(200).redirect(
        // 2-3. user_id, access_token, refresh_token, user_email, new=true 전송
        `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
      );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우), 세션 업데이트
      await pool.query(
        "UPDATE Session SET access_token = ? WHERE user_id = ?",
        [access_token, user_id]
      );

      res.status(200).redirect(
        // 2-5. user_id, access_token, refresh_token, new=false 전송
        `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
      );
    }
  } catch (err) {
    const user_id =
      err.response && err.response.data && err.response.data.id
        ? String(err.response.data.id)
        : null;
    errLog("AUTH_04", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "카카오 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_05 : 네이버 리다이렉트
router.get("/naver/redirect", async (req, res) => {
  // 0. authorization code를 AUTH_02에서 받아옴
  const { code, state } = req.query;
  const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${naverReq.client_id}&client_secret=${naverReq.client_secret}&redirect_uri=${naverReq.redirect_uri}&code=${code}&state=${state}`;

  // 1. access_token 발급
  try {
    const response = await axios.post(
      tokenUrl,
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Naver-Client-Id": naverReq.client_id,
          "X-Naver-Client-Secret": naverReq.client_secret,
        },
      }
    );

    const { access_token, refresh_token } = response.data;

    // 2. access_token을 사용하여 사용자 정보 가져오기
    const userInfoUrl = "https://openapi.naver.com/v1/nid/me";
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userInfoResponse.data.response;
    const user_id = String(userInfo.id);
    const user_email = userInfo.email;

    // 2-1. 사용자 정보 중 고유값인 id를 추출하여 User 테이블에 있는지(회원인지) 확인
    const [rows] = await pool.query("SELECT * FROM User WHERE user_id = ?", [
      user_id,
    ]);

    if (rows.length === 0) {
      // 2-2. DB에 없을 경우, 회원가입으로 넘기도록 함
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
        );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우), 세션 업데이트
      await pool.query(
        "UPDATE Session SET access_token = ? WHERE user_id = ?",
        [access_token, user_id]
      );

      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
        );
    }
  } catch (err) {
    const user_id =
      err.response && err.response.data && err.response.data.id
        ? String(err.response.data.id)
        : null;
    errLog("AUTH_05", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "네이버 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_06 : 구글 리다이렉트
router.get("/google/redirect", async (req, res) => {
  // 0. authorization code를 AUTH_02에서 받아옴
  const { code } = req.query;
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const tokenData = {
    grant_type: "authorization_code",
    client_id: googleReq.client_id,
    redirect_uri: googleReq.redirect_uri,
    client_secret: googleReq.client_secret,
    code, // authorization code
  };

  // 1. access_token 발급
  try {
    const response = await axios.post(tokenUrl, qs.stringify(tokenData), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, refresh_token } = response.data;

    // 2. access_token을 사용하여 사용자 정보 가져오기
    const userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
    const userInfoResponse = await axios.get(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfo = userInfoResponse.data;
    const user_id = String(userInfo.id);
    const user_email = userInfo.email;

    // 2-1. 사용자 정보 중 고유값인 id를 추출하여 User 테이블에 있는지(회원인지) 확인
    const [rows] = await pool.query("SELECT * FROM User WHERE user_id = ?", [
      user_id,
    ]);

    if (rows.length === 0) {
      // 2-2. DB에 없을 경우, 회원가입으로 넘어가도록 함
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
        );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우), 세션 업데이트
      await pool.query(
        "UPDATE Session SET access_token = ? WHERE user_id = ?",
        [access_token, user_id]
      );

      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
        );
    }
  } catch (err) {
    const user_id =
      err.response && err.response.data && err.response.data.id
        ? String(err.response.data.id)
        : null;
    errLog("AUTH_06", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "구글 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_07 : 로그아웃
router.post("/logout", async (req, res) => {
  const { user_id, user_provider, access_token } = req.body;

  // 0. 유효한 user_provider 목록
  const validProviders = ["kakao", "naver", "google"];

  // 1. user_provider가 유효하지 않은 경우 예외 처리
  if (!validProviders.includes(user_provider)) {
    errLog("AUTH_07", 400, "Bad Request", { user_provider: user_provider });
    return res
      .status(400)
      .json({ message: "유효하지 않은 프로바이더 입니다." });
  }

  try {
    // 2. Session 테이블에서 user_id와 access_token이 올바르게 짝지어져 있는지 확인
    const isValidSession = await validateSession(user_id, access_token);
    if (!isValidSession) {
      errLog("AUTH_07", 401, "Unauthorized", { user_id: user_id });
      return res
        .status(401)
        .json({ message: "user_id와 access_token이 일치하지 않습니다." });
    }

    // 3. user_provider값에 따른 switch-case 처리
    switch (user_provider) {
      // 3-1. kakao OAuth logout
      case "kakao":
        await axios.post("https://kapi.kakao.com/v1/user/logout", null, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        await deleteSession(user_id);
        return res
          .status(200)
          .json({ message: "카카오 로그아웃을 완료했습니다." });
      // 3-2. naver OAuth logout
      case "naver":
        await axios.post(
          "https://nid.naver.com/oauth2.0/token",
          qs.stringify({
            grant_type: "delete",
            client_id: naverReq.client_id,
            client_secret: naverReq.client_secret,
            access_token,
          }),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        await deleteSession(user_id);
        return res
          .status(200)
          .json({ message: "네이버 로그아웃을 완료했습니다." });
      // 3-3. google OAuth logout
      case "google":
        await axios.post(
          `https://oauth2.googleapis.com/revoke?token=${access_token}`,
          {},
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        await deleteSession(user_id);
        return res
          .status(200)
          .json({ message: "구글 로그아웃을 완료했습니다." });
      // 3-4. default - 500 err
      default:
        errLog("AUTH_07", 500, "Internal Server Error", {
          user_provider: user_provider,
        });
        res.status(500).json({
          message: "로그아웃에 실패했습니다. 다시 시도해주세요.",
        });
    }
  } catch (err) {
    errLog("AUTH_07", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "로그아웃에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_08 : 회원가입
router.post("/signup", async (req, res) => {
  const {
    user_id,
    access_token,
    user_provider,
    user_email,
    user_nickname,
    user_subscription,
    user_prefer,
  } = req.body;

  let connection;

  try {
    // 1. 이메일 중복 체크
    const [existingUsers] = await pool.query(
      "SELECT * FROM User WHERE user_email = ?",
      [user_email]
    );

    if (existingUsers.length > 0) {
      errLog("AUTH_08", 409, "Conflict", {
        user_id: user_id,
        user_email: user_email,
      });
      return res.status(409).json({
        message: "중복된 이메일이 있습니다. 이메일을 다시 확인해주세요.",
      });
    }

    // 2. 트랜잭션 시작
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 3-1. Session 테이블에 user_id, access_token 저장
    await connection.query(
      "INSERT INTO Session (user_id, access_token) VALUES (?,?)",
      [user_id, access_token]
    );
    // 3-2. User 테이블에 user_id, user_email, user_provider 저장
    await connection.query(
      "INSERT INTO User (user_id, user_email, user_provider) VALUES (?, ?, ?)",
      [user_id, user_email, user_provider]
    );
    // 3-3. MyPage 테이블에 user_id, user_nickname, user_subscription, cate_no, situ_no 저장
    for (const prefer of user_prefer) {
      const { cate_no, situ_no } = prefer;
      await connection.query(
        "INSERT INTO MyPage (user_id, user_nickname,  user_subscription, cate_no, situ_no) VALUES (?, ?, ?, ?, ?)",
        [user_id, user_nickname, user_subscription, cate_no, situ_no]
      );
    }
    // 3-4. user_subscription이 true일 때 Subscription 테이블에 user_id, user_nickname, user_email, cate_no, situ_no 저장
    if (user_subscription == true) {
      for (const prefer of user_prefer) {
        const { cate_no, situ_no } = prefer;
        await connection.query(
          "INSERT INTO Subscription (user_id, user_email, user_nickname, cate_no, situ_no) VALUES (?, ?, ?, ?, ?)",
          [user_id, user_email, user_nickname, cate_no, situ_no]
        );
      }
    }
    // 3-5. Refrigerator 기본값 저장
    await connection.query(
      "INSERT INTO Refrigerator (refrigerator_name, refrigerator_type, user_id) VALUES (?, ?, ?)",
      ["냉장고", 1, user_id]
    );
    await connection.query(
      "INSERT INTO Refrigerator (refrigerator_name, refrigerator_type, user_id) VALUES (?, ?, ?)",
      ["냉동고", 2, user_id]
    );

    // 4. 트랜잭션 커밋
    await connection.commit();

    res.status(200).json({ message: "회원 가입이 완료되었습니다." });
  } catch (err) {
    // 5. 실패 시 트랜잭션 롤백
    if (connection) await connection.rollback();
    errLog("AUTH_08", 500, "Internal Server Error", {
      user_id: user_id,
      error: err.message,
    });
    res
      .status(500)
      .json({ message: "회원 가입에 실패했습니다. 다시 시도해주세요." });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
