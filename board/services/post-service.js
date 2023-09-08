const paginator = require("../utils/paginator");
const passwordEncryption = require("../utils/passwordEncryptionUtil");
const { ObjectId } = require("mongodb");


//글쓰기
async function writePost(collection, post) { //글쓰기함수
    post.hits = 0;
    post.password = passwordEncryption.salted(post.password);
    post.createdDt = new Date().toISOString(); //날짜는 ISO 포맷으로 저장
    return await collection.insertOne(post); //몽고디비에 post를 저장 후 결과 반환
}

//리스트
async function list(collection, page, search) {
    const perPage = 10;
    const query = { title: new RegExp(search, "i") };
    const cursor = collection.find(query, { limit: perPage, skip: (page - 1) * perPage }).sort({
        createdDt: -1,
    });

    const totalCount = await collection.count(query);
    const posts = await cursor.toArray();

    const paginatorObj = paginator({ totalCount, page, erPage: perPage });
    return [posts, paginatorObj];
}

//상세페이지 게시글 가져오기
//패스워드는 노출 할 필요없으므로 결괏값으로 가져오지 않음
const projectionOption = {
    projection: {
        //프로젝션(투영)결괏값에서 일부만 가져올 때 사용
        password: 0,
        "comments.pasword": 0,
    },
};

async function getDetailPost(collection, id){
    //몽고DB Collection의 findOneAndUpdate() 함수를 사용
    //게시글을 읽을 때마다 hist를 1 증가
    return await collection.findOneAndUpdate({_id: ObjectId(id)}, {$inc: {hits:1}});
}

async function getPostByIdAndPassword(collection, {id, password}) {
    // findOne() 함수사용    
    return await collection.findOne({_id: ObjectId(id), password: passwordEncryption.salted(password)}, projectionOption );
}

async function getPostById(collection, id) {
    return await collection.findOne({_id: ObjectId(id)}, projectionOption);
}

async function updatePost(collection, id, post) {
    const toUpdatePost = {
        $set: {
            ...post,
            password : passwordEncryption.salted(post.password), // 수정 시 패스워드 암호화
        },
    };
    return await collection.updateOne({_id: ObjectId(id)}, toUpdatePost);
}

async function deletePost(collection, id, password) {

    const result = await collection.deleteOne({ _id: ObjectId(id), password: passwordEncryption.salted(password)});

    if (result.deletedCount !==1) {
        return false;
    }
    return true;
}

module.exports = { //require()로 파일을 임포트 시 외부로 노출하는 객체
    list,
    writePost,
    getDetailPost,
    getPostByIdAndPassword,
    getPostById,
    updatePost,
    deletePost,
};