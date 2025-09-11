import React, { useState, useEffect } from "react";
import { getUser } from "../../services/api";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  CardBody,
  Button,
  Label,
  Input,
  FormFeedback,
  Form,
} from "reactstrap";
// Formik Validation

import { useFormik } from "formik";

//redux
import { useSelector, useDispatch } from "react-redux";
import * as Yup from "yup";
import avatar from "../../assets/images/users/avatar-1.jpg";
// actions
import { editProfile, resetProfileFlag } from "../../slices/thunks";
import { setUser } from "../../slices/login/loginSlice";
import ImageUpload from "../../Components/Common/imageUpload";
import AvatarDisplay from "../../Components/Common/displayAvatar";
const UserProfile = () => {
  const dispatch = useDispatch();
  const [email, setemail] = useState("admin@gmail.com");
  const [idx, setidx] = useState("1");

  const [userName, setUserName] = useState("Admin");
  const [avatarUpdated, setAvatarUpdated] = useState(false);  // ✅ Correct state management

  const { user, success, error } = useSelector(state => ({
    user: state.Loginn.user,
    success: state.Profile.success,
    error: state.Profile.error
  }));

  useEffect(() => {
    getUser(); //set iser in localstorage for refresh
    const userr = JSON.parse(localStorage.getItem("user")); // Retrieve and parse the user object
    dispatch(setUser(userr));
    if (user
    ) {
      try {

        setUserName(user.firstName || "Unknown User");
        setemail(user.email || "");
        setidx(user.id || "1");
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }

  }, [dispatch]);


  const validation = useFormik({
    // enableReinitialize : use this flag when initial values needs to be changed
    enableReinitialize: true,

    initialValues: {
      first_name: userName || 'Admin',
      idx: idx || '',
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required("Please Enter Your UserName"),
    }),
    onSubmit: (values) => {
      dispatch(editProfile(values));
    }
  });

  document.title = "Profile | Nestleo";
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Row>
            <Col lg="12">
              {error && error ? <Alert color="danger">{error}</Alert> : null}
              {success ? <Alert color="success">Username Updated To {user?.firstName}</Alert> : null}

              <Card>
                <CardBody>
                  <div className="d-flex">
                    <div className="mx-3">
                      {/* //display */}
                      <AvatarDisplay
                        userId={user?.id}
                    
                      />

                    </div>
                    <div className="flex-grow-1 align-self-center">
                      <div className="text-muted">
                        <h5>{user?.firstName|| "Admin"}</h5>
                        <p className="mb-1">Email Id : {user?.email}</p>
                        <p className="mb-0">Id No : #{user?.id}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <h4 className="card-title mb-4">Profile Settings</h4>
          {/* //upload image 
           <Card>
            <CardBody>
              <ImageUpload avatarUpdated={setAvatarUpdated} />
            </CardBody>
          </Card>  */}
          <Card>
            <CardBody>
              <Form
                className="form-horizontal"
                onSubmit={(e) => {
                  e.preventDefault();
                  validation.handleSubmit();
                  return false;
                }}
              >
                <div className="form-group">
                  <Label className="form-label">User Name</Label>
                  <Input
                    name="first_name"
                    // value={name}
                    className="form-control"
                    placeholder="Enter User Name"
                    type="text"
                    onChange={validation.handleChange}
                    onBlur={validation.handleBlur}
                    value={validation.values.first_name || ""}
                    invalid={
                      validation.touched.first_name && validation.errors.first_name ? true : false
                    }
                  />
                  {validation.touched.first_name && validation.errors.first_name ? (
                    <FormFeedback type="invalid">{validation.errors.first_name}</FormFeedback>
                  ) : null}
                  <Input name="idx" value={idx} type="hidden" />
                </div>
                <div className="text-center mt-4">
                  <Button type="submit" color="danger">
                    Update User Name
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default UserProfile;
