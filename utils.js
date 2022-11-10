import jwt from "jsonwebtoken";
export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(403).send({ message: "Forbidden" });
  } else {
    jwt.verify(authHeader, process.env.SECRET, (err, decoded) => {
      if (err) {
        res.status(401).send({ message: "unauthorized" });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  }
};
