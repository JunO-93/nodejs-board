// controller 역할 라우터
const express = require("express");
const postService = require("./services/post-service"); // service file loading
const handlebars = require("express-handlebars");
const app = express();
const mongodbConnection = require("./configs/mongodb-connection");
const { ObjectId } = require("mongodb");

// req.body와 POST 요청을 해석하기 위한 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//select web templete engine
app.engine("handlebars", handlebars.create({ //핸들바 생성 및 엔진 반환
        helpers: require("./configs/handlebars-helper"),
    }).engine,
);
app.set("view engine", "handlebars");
app.set("views", __dirname + "/views"); //뷰디렉터리 설정

//메인화면 리스트페이지
app.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    try{
        const [posts, paginator] = await postService.list(collection, page, search);        
        res.render("home", { title: "테스트게시판", search, paginator, posts}); 
    } catch (error) {
        console.error(error);
        res.render("home", {title: "테스트 게시판"});
    }       
});

//글쓰기 페이지 이동, mode는 create
app.get("/write", (req, res) => {
    res.render("write", { title: "테스트 게시판", mode: "create"});
});
app.post("/write", async (req, res) => {
    const post = req.body;
    const result = await postService.writePost(collection, post); //글쓰기 후 결과 DB 반환
    res.redirect(`/detail/${result.insertedId}`); //생성된 도큐먼트의 _id를 사용해 상세페이지로 이동
});
// 수정 페이지로 이동 mode는 modify
app.get("/modify/:id", async (req, res) => {
    const { id } = req.params.id;
    //getPostById() 함수로 게시글 데이터를 받아옴
    const post = await postService.getPostById(collection, req.params.id);
    console.log(post);
    res.render("write", { title: "테스트 게시판 ", mode: "modify", post});
});

//게시글 수정 API
app.post("/modify", async (req, res) => {
    const { id, title, writer, password, content } = req.body;

    const post = {
        title,
        writer,
        password,
        content,
        createDt: new Date().toISOString(),
    };
    //업데이트결과
    const result = postService.updatePost(collection, id, post);
    res.redirect(`/detail/${id}`);
});

//게시글 삭제 API
app.delete("/delete", async (req, res) => {
    const { id, password } = req.body;
    try {
        //collection의 deleteONe을 사용해 게시글 하나를 삭제
        const isSuccess = postService.deletePost(collection, id, password);
        return res.json({ isSuccess: isSuccess});

    } catch (err) { //DB 연결이 안되거나 네트워크 연결 불안정일때 처리
        console.error(err);
        return res.json({ isSuccess: false });
    }
});

//댓글쓰기 API
app.post("/write-comment", async (req, res) => {
    const { id, name, password, comment } = req.body; // body로 데이터 가져오기
    const post = await postService.getPostById(collection, id); //id로 게시글 정보 가져오기

    //게시글에 기존 댓글 리스트가 있으면 추가
    if (post.comments) {
        post.comments.push({
            idx: post.comments.length + 1,
            name,
            password,
            comment,
            createdDt: new Date().toISOString(),
        });
    } else {
        //게시글에 댓글정보가 없으면 리스트에 댓글 정보 추가
        post.comments = [
            {
                idx: 1,
                name,
                password,
                comment,
                createdDt: new Date().toISOString(),
            },
        ];
    }

    //업데이트하기. 업데이트 후에는 상세페이지로 다시 리다이렉트
    postService.updatePost(collection, id, post);
    return res.redirect(`/detail/${id}`);
});

// 댓글삭제 API
app.delete("/delete-comment", async(req, res) => {
    const { id, idx, password } = req.body;
    //게시글의 comments 안에 있는 특정 댓글 데이터를 찾기
    const post = await collection.findOne(
        {
            _id: ObjectId(id),
            comments: { $elemMatch: { idx: parseInt(idx), password}},
        },
        postService.projectionOption, 
    );
    
    //데이터가 없으면 isSuccess : false를 주면서 종료
    if(!post) {
        return res.json({ isSuccess: false});
    }

    //댓글번호가 idx 이외인 것만 comments에 다시 저장 후 저장
    post.comments = post.comments.filter((comment) => comment.idx != idx);
    postService.updatePost(collection, id, post);
    return res.json({ isSuccess: true});
});

//상세페이지 이동
app.get("/detail/:id", async(req, res) => {
    // 게시글정보 가져오기
    const result = await postService.getDetailPost(collection, req.params.id);     
    res.render("detail", { 
        title: "테스트 게시판", 
        post:result.value,
    });
});

//패스워드 체크
app.post("/check-password", async (req, res) => {
    //id, passwor값 가져옴
    const {id, password} = req.body;

    //postService의 getPostByIdAndPassword() 함수를 사용해 게시글 데이터를 확인
    const post = await postService.getPostByIdAndPassword(collection, {id, password});

    //데이터가 있으면 isExist true, 없으면 isExist false
    if (!post) {
        return res.status(404).json({ isExist:false });
    } else {
        return res.json({ isExist:true });
    }
});

//db connect
let collection;
app.listen(3000, async () => {
    console.log("Server started");
    const mongoClient = await mongodbConnection();
    collection = mongoClient.db().collection("post");
    console.log("MongoDB connected");
});