import { useEffect, useState } from "react";
import { getToken } from "../../services/api";

const useProfile = () => {
  const tokenuser = getToken();
  var token =
  tokenuser &&
  tokenuser["token"];
  const [loading, setLoading] = useState(tokenuser ? false : true);
  const [userProfile, setUserProfile] = useState(
    tokenuser ? tokenuser : null
  );

  useEffect(() => {
    const tokenuser = getToken();
    var token =
      tokenuser &&
      tokenuser["token"];
    setUserProfile(tokenuser ? tokenuser : null);
    setLoading(token ? false : true);
  }, []);


  return { userProfile, loading,token };
};

export { useProfile };