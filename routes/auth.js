const express = require("express");
const router = express.Router();
const axios = require("axios");
const qs = require("qs");

const { pool } = require("../scripts/connectMySQL");

const User = require("../models/user");//////

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

// AUTH_01
router.post("/TokenValidationCheck", async (req, res) => {
  console.log("access token 유효성 검사");
  const { provider, access_token } = req.body;

  try {
    switch (provider) {
      case "kakao":
        console.log("kakao access token validation check");
        const kakaoAuthURL = `https://kapi.kakao.com/v1/user/access_token_info`;

        try {
          const response = await axios.get(kakaoAuthURL, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          if (err.response && err.response.status === 401) {
            res
              .status(401)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            res.status(500).json({
              message: "카카오 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;

      case "naver":
        console.log("naver access token validation check");
        const naverAuthURL = `https://openapi.naver.com/v1/nid/me`;

        try {
          const response = await axios.get(naverAuthURL, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          if (err.response && err.response.status === 401) {
            res
              .status(401)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            res.status(500).json({
              message: "네이버 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;

      case "google":
        console.log("google access token validation check");
        const googleAuthURL = `https://oauth2.googleapis.com/tokeninfo`;

        try {
          const response = await axios.get(googleAuthURL, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });
          res.status(200).json({ message: "유효한 액세스 토큰입니다." });
        } catch (err) {
          if (err.response && err.response.status === 401) {
            res
              .status(401)
              .json({ message: "유효하지 않은 액세스 토큰입니다." });
          } else {
            res.status(500).json({
              message: "구글 토큰 검증에 실패했습니다. 다시 시도해주세요.",
            });
          }
        }
        break;

      default:
        res.status(400).json({ message: "유효하지 않은 프로바이더 입니다." });
        break;
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      message: "토큰 검증에 실패했습니다. 다시 시도해주세요.",
    });
  }
});

// AUTH_02
router.post("/requestToken", function (req, res) {
  const { provider } = req.body;
  console.log(`token 요청 ${provider}`);

  try {
    switch (provider) {
      // kakao OAuth 인증 요청
      case "kakao":
        console.log("카카오");
        const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${kakaoReq.client_id}&redirect_uri=${kakaoReq.redirect_uri}&scope=${kakaoReq.scope}`;
        res.status(200).send(kakaoAuthURL);
        break;
      // naver OAuth 인증 요청
      case "naver":
        console.log("네이버");
        const naverAuthURL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${naverReq.client_id}&redirect_uri=${naverReq.redirect_uri}&state=${naverReq.state}`;
        res.status(200).send(naverAuthURL);
        break;
      // googla OAuth 인증 요청
      case "google":
        const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${googleReq.client_id}&redirect_uri=${googleReq.redirect_uri}&scope=${googleReq.scope}`;
        res.status(200).send(googleAuthURL);
        break;
      default:
        //provider 없을 경우 400
        return res
          .status(400)
          .json({ message: "유효하지 않은 프로바이더 입니다." });
    }
  } catch (err) {
    console.error(`Error requesting token for ${provider}:`, err);
    res
      .status(500)
      .json({ message: "토큰 발급 요청에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_03
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
    const isUser = await User.findOne({ user_id });

    if (!isUser) {
      // 2-2. DB에 없을 경우, new: true 전송
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
        );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우) 함수 마저 진행, new: false 전송
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
        );
    }
  } catch (err) {
    console.error("Error during Kakao login:", err);
    res
      .status(500)
      .json({ message: "카카오 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_04
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

    // 2-1. 사용자 정보 중 고유값인 id를 추출하여 User collection에 있는지(회원인지) 확인
    const isUser = await User.findOne({ user_id });

    if (!isUser) {
      // 2-2. DB에 없을 경우 (= 회원이 아닐 경우)
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
        );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우) 함수 마저 진행, new: false 전송
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
        );
    }
  } catch (err) {
    console.error("Error during Naver login:", err);
    res
      .status(500)
      .json({ message: "네이버 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_05
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

    // 2-1. 사용자 정보 중 고유값인 id를 추출하여 User collection에 있는지(회원인지) 확인
    const isUser = await User.findOne({ user_id });

    if (!isUser) {
      // 2-2. DB에 없을 경우 (= 회원이 아닐 경우) 발급받은 토큰을 서버측에서 무효화
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=true&user_email=${user_email}`
        );
    } else {
      // 2-4. DB에 있을 경우 (= 회원일 경우) 함수 마저 진행, new: false 전송
      res
        .status(200)
        .redirect(
          `${front_uri}/auth?user_id=${user_id}&access_token=${access_token}&refresh_token=${refresh_token}&new=false`
        );
    }
  } catch (err) {
    console.error("Error during Google login:", err);
    res
      .status(500)
      .json({ message: "구글 로그인에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_06
router.post("/logout", async (req, res) => {
  console.log("로그아웃 요청");
  const { provider, access_token } = req.body;

  try {
    switch (provider) {
      // kakao OAuth logout
      case "kakao":
        await axios.post("https://kapi.kakao.com/v1/user/logout", null, {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        });
        return res
          .status(200)
          .json({ message: "카카오 로그아웃을 완료했습니다." });
      // naver OAuth logout
      case "naver":
        // Naver OAuth logout
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
        return res
          .status(200)
          .json({ message: "네이버 로그아웃을 완료했습니다." });
      // google OAuth logout
      case "google":
        // Google OAuth logout
        await axios.post(
          `https://oauth2.googleapis.com/revoke?token=${access_token}`,
          {},
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        return res
          .status(200)
          .json({ message: "구글 로그아웃을 완료했습니다." });
      default:
        //provider 없을 경우 404
        return res
          .status(404)
          .json({ message: "유효하지 않은 프로바이더 입니다." });
    }
  } catch (err) {
    console.error(`Error requesting token for ${provider}:`, err);
    res
      .status(500)
      .json({ message: "로그아웃에 실패했습니다. 다시 시도해주세요." });
  }
});

// AUTH_07
router.post("/signup", async (req, res) => {
  console.log("회원가입 완료 버튼 클릭");
  const {
    user_id,
    user_email,
    user_nickname,
    user_provider,
    user_subscription,
    user_prefer,
  } = req.body;

  const user_bookmark = [];
  const user_searchfilter = [];

  // 3. 최종적인 정보 회원 가입 던지기
  try {
    // 3-1. 이메일 중복체크
    const existingUser = await User.findOne({ user_email });

    if (existingUser) {
      return res.status(400).json({
        message: "중복된 이메일이 있습니다. 이메일을 다시 확인해주세요.",
      });
    }

    // 3-2. 중복체크 안걸리면 진행
    const newUser = new User({
      user_id,
      user_email,
      user_nickname,
      user_provider,
      user_subscription,
      user_prefer,
      user_bookmark,
      user_searchfilter,
    });

    await newUser.save();
    res.status(201).json({ message: "회원 가입이 완료되었습니다." });
  } catch (err) {
    console.error("Error registering user: ", err);
    res
      .status(500)
      .json({ message: "회원 가입에 실패했습니다. 다시 시도해주세요." });
  }
});

module.exports = router;
